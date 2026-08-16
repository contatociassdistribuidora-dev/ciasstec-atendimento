import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient, getAdminConfigStatus } from "@/lib/supabase/admin";
import { normalizeAttendantInput, validateAttendant, toLegacyProfileRole, permissionOverrides } from "@/lib/attendants";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Administração do Supabase não configurada no servidor.", diagnostics: getAdminConfigStatus() }, { status: 503 });

  const [{ data: profiles, error: profileError }, { data: authData, error: authError }, { data: roles }, { data: overrides }] = await Promise.all([
    admin.from("profiles").select("id,email,full_name,role,phone,whatsapp,whatsapp_enabled,active,last_login_at,created_at").order("created_at"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("user_roles").select("user_id,role_name"),
    admin.from("user_permissions").select("user_id,permission_key,allowed"),
  ]);
  if (profileError || authError) return NextResponse.json({ error: profileError?.message ?? authError?.message }, { status: 500 });

  const authUsers = new Map(authData.users.map((user) => [user.id, user]));
  const attendants = (profiles ?? []).map((profile) => {
    const user = authUsers.get(profile.id);
    return { ...profile, role: roles?.find(row=>row.user_id===profile.id)?.role_name ?? (profile.role==="technician"?"tecnico":profile.role==="admin"?"admin":"vendedor"), permissions:(overrides??[]).filter(row=>row.user_id===profile.id), email: profile.email || user?.email || "", last_login_at: user?.last_sign_in_at ?? profile.last_login_at };
  });
  return NextResponse.json({ attendants, diagnostics: getAdminConfigStatus() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Administração do Supabase não configurada no servidor.", diagnostics: getAdminConfigStatus() }, { status: 503 });

  const body = await request.json() as Record<string, unknown>;
  const input = normalizeAttendantInput(body);
  const password = String(body.password ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");
  const permissions = Array.isArray(body.permissions) ? body.permissions.filter((value):value is string=>typeof value==="string") : [];
  const validationError = validateAttendant(input);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "A senha inicial deve ter pelo menos 8 caracteres." }, { status: 400 });
  if (password !== confirmPassword) return NextResponse.json({ error: "As senhas não coincidem." }, { status: 400 });

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });
  const existing = listed.users.find((user) => user.email?.toLowerCase() === input.email);
  let userId = existing?.id;
  let created = false;
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      user_metadata: { ...existing.user_metadata, full_name: input.fullName },
      app_metadata: { ...existing.app_metadata, role: input.role },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
      app_metadata: { role: input.role },
    });
    if (error || !data.user) return NextResponse.json({ error: error?.message ?? "Não foi possível criar o usuário." }, { status: 400 });
    userId = data.user.id;
    created = true;
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId!, email: input.email, full_name: input.fullName, role: toLegacyProfileRole(input.role),
    phone: input.phone || null, whatsapp: input.whatsapp || null,
    whatsapp_enabled: input.whatsappEnabled, active: input.active,
  });
  if (profileError) {
    if (created) await admin.auth.admin.deleteUser(userId!);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  const { error: accessError } = await admin.auth.admin.updateUserById(userId!, {
    ban_duration: input.active ? "none" : "876000h",
  });
  if (accessError) return NextResponse.json({ error: accessError.message }, { status: 400 });
  const { error: roleError } = await admin.from("user_roles").upsert({user_id:userId!,role_name:input.role});
  if (roleError) return NextResponse.json({error:roleError.message},{status:500});
  await admin.from("user_permissions").delete().eq("user_id",userId!);
  const overridesToSave=permissionOverrides(input.role,permissions);
  if (overridesToSave.length) {
    const {error:permissionError}=await admin.from("user_permissions").insert(overridesToSave.map(item=>({user_id:userId!,...item,updated_by:auth.user.id})));
    if(permissionError)return NextResponse.json({error:permissionError.message},{status:500});
  }
  return NextResponse.json({ ok: true, id: userId, created }, { status: created ? 201 : 200 });
}
