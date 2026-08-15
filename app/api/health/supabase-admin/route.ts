import { NextResponse } from "next/server";
import { getAdminConfigStatus } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = getAdminConfigStatus();
  return NextResponse.json({
    SUPABASE_URL: status.supabaseUrlConfigured,
    SERVICE_ROLE: status.serviceRoleConfigured,
  }, { headers: { "Cache-Control": "no-store" } });
}
