import { redirect } from "next/navigation";
import { AtendimentoApp } from "@/components/atendimento-app";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=config");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("full_name, role, active").eq("id", user.id).maybeSingle();
  if (profileError || !profile) { await supabase.auth.signOut(); redirect("/login?error=profile"); }
  if (!profile.active) { await supabase.auth.signOut(); redirect("/login?error=inactive"); }
  return <AtendimentoApp user={{ email: user.email ?? "", fullName: profile?.full_name ?? user.email ?? "Usuário", role: profile?.role ?? "attendant" }} />;
}
