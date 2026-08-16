import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { getIntegrationStatus } from "@/lib/integrations/status";

export async function GET() {
  const auth = await requirePermission("configuracoes.manage_integrations");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json(getIntegrationStatus(), { headers: { "Cache-Control": "no-store" } });
}
