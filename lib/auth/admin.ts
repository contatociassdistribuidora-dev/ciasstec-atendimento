import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado.", status: 503 } as const;

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Não autenticado.", status: 401 } as const;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !profile.active || profile.role !== "admin") {
    return { error: "Acesso restrito a administradores.", status: 403 } as const;
  }

  return { user, supabase } as const;
}
