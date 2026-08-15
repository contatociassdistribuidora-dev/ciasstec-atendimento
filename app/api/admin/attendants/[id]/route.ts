import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient, getAdminConfigStatus } from "@/lib/supabase/admin";
import { normalizeAttendantInput, validateAttendant } from "@/lib/attendants";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Administração do Supabase não configurada no servidor.", diagnostics: getAdminConfigStatus() }, { status: 503 });
  const { id } = await context.params;
  const input = normalizeAttendantInput(await request.json() as Record<string, unknown>);
  const validationError = validateAttendant(input);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const { error: authError } = await admin.auth.admin.updateUserById(id, { email: input.email, app_metadata: { role: input.role } });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
  const { error } = await admin.from("profiles").update({
    email: input.email, full_name: input.fullName, role: input.role, phone: input.phone || null,
    whatsapp: input.whatsapp || null, whatsapp_enabled: input.whatsappEnabled, active: input.active,
  }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
