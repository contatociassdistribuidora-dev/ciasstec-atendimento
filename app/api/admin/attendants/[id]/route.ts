import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient, getAdminConfigStatus } from "@/lib/supabase/admin";
import { normalizeAttendantInput, validateAttendant, toLegacyProfileRole, permissionOverrides } from "@/lib/attendants";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Administração do Supabase não configurada no servidor.", diagnostics: getAdminConfigStatus() }, { status: 503 });
  const { id } = await context.params;
  const body = await request.json() as Record<string,unknown>;
  const input = normalizeAttendantInput(body);
  const permissions=Array.isArray(body.permissions)?body.permissions.filter((value):value is string=>typeof value==="string"):[];
  const validationError = validateAttendant(input);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const { error: authError } = await admin.auth.admin.updateUserById(id, {
    email: input.email,
    app_metadata: { role: input.role },
    ban_duration: input.active ? "none" : "876000h",
  });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
  const { error } = await admin.from("profiles").update({
    email: input.email, full_name: input.fullName, role: toLegacyProfileRole(input.role), phone: input.phone || null,
    whatsapp: input.whatsapp || null, whatsapp_enabled: input.whatsappEnabled, active: input.active,
  }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const {error:roleError}=await admin.from("user_roles").upsert({user_id:id,role_name:input.role});
  if(roleError)return NextResponse.json({error:roleError.message},{status:400});
  await admin.from("user_permissions").delete().eq("user_id",id);
  const overridesToSave=permissionOverrides(input.role,permissions);
  if(overridesToSave.length){const {error:permissionError}=await admin.from("user_permissions").insert(overridesToSave.map(item=>({user_id:id,...item,updated_by:auth.user.id})));if(permissionError)return NextResponse.json({error:permissionError.message},{status:400});}
  return NextResponse.json({ ok: true });
}
