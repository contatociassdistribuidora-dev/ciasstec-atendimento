import { redirect } from "next/navigation";
import { AttendantManagement } from "@/components/attendant-management";
import { createClient } from "@/lib/supabase/server";

export default async function AttendantsPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=config");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role,active").eq("id", user.id).maybeSingle();
  if (!profile?.active) redirect("/login?error=inactive");
  if (profile.role !== "admin") redirect("/dashboard");
  return <AttendantManagement/>;
}
