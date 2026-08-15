import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient, getAdminConfigStatus } from "@/lib/supabase/admin";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Administração do Supabase não configurada no servidor.", diagnostics: getAdminConfigStatus() }, { status: 503 });
  const { id } = await context.params;
  const body = await request.json() as { password?: unknown; confirmPassword?: unknown };
  const password = String(body.password ?? "");
  if (password.length < 8) return NextResponse.json({ error: "A nova senha deve ter pelo menos 8 caracteres." }, { status: 400 });
  if (password !== String(body.confirmPassword ?? "")) return NextResponse.json({ error: "As senhas não coincidem." }, { status: 400 });
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
