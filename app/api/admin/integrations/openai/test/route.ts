import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { getIntegrationStatus } from "@/lib/integrations/status";

export async function POST() {
  const auth = await requirePermission("configuracoes.manage_integrations");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!getIntegrationStatus().openai.configured) {
    return NextResponse.json({ ok: false, message: "OPENAI_API_KEY não está configurada no servidor." }, { status: 503 });
  }

  return NextResponse.json({ ok: true, message: "OPENAI_API_KEY está configurada no servidor." });
}
