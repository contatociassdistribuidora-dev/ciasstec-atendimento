import { redirect } from "next/navigation";
import { AttendantManagement } from "@/components/attendant-management";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/permissions";

export default async function AttendantsPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=config");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role,active").eq("id", user.id).maybeSingle();
  if (!profile?.active) redirect("/login?error=inactive");
  const access=await requirePermission("usuarios.view");
  if ("error" in access) redirect("/dashboard?ACCESS_DENIED=true");
  return <AttendantManagement/>;
}
