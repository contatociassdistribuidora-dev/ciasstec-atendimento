import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeAttendantInput, validateAttendant } from "@/lib/attendants";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Administração do Supabase não configurada no servidor." }, { status: 503 });

  const [{ data: profiles, error: profileError }, { data: authData, error: authError }] = await Promise.all([
    admin.from("profiles").select("id,email,full_name,role,phone,whatsapp,whatsapp_enabled,active,last_login_at,created_at").order("created_at"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (profileError || authError) return NextResponse.json({ error: profileError?.message ?? authError?.message }, { status: 500 });

  const authUsers = new Map(authData.users.map((user) => [user.id, user]));
  const attendants = (profiles ?? []).map((profile) => {
    const user = authUsers.get(profile.id);
    return { ...profile, email: profile.email || user?.email || "", last_login_at: user?.last_sign_in_at ?? profile.last_login_at };
  });
  return NextResponse.json({ attendants }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Administração do Supabase não configurada no servidor." }, { status: 503 });

  const body = await request.json() as Record<string, unknown>;
  const input = normalizeAttendantInput(body);
  const password = String(body.password ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");
  const validationError = validateAttendant(input);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "A senha inicial deve ter pelo menos 8 caracteres." }, { status: 400 });
  if (password !== confirmPassword) return NextResponse.json({ error: "As senhas não coincidem." }, { status: 400 });

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
    app_metadata: { role: input.role },
  });
  if (error || !data.user) return NextResponse.json({ error: error?.message ?? "Não foi possível criar o usuário." }, { status: 400 });

  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id, email: input.email, full_name: input.fullName, role: input.role,
    phone: input.phone || null, whatsapp: input.whatsapp || null,
    whatsapp_enabled: input.whatsappEnabled, active: input.active,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.user.id }, { status: 201 });
}
