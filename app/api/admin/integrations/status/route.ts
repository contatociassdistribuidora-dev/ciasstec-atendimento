import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getIntegrationStatus } from "@/lib/integrations/status";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json(getIntegrationStatus(), { headers: { "Cache-Control": "no-store" } });
}
