"use client";

import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const emptyPasswords = { current: "", next: "", confirmation: "" };

export function AccountSecurity() {
  const [email, setEmail] = useState("");
  const [passwords, setPasswords] = useState(emptyPasswords);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!passwords.current || !passwords.next || !passwords.confirmation) return setMessage({ tone: "error", text: "Preencha todos os campos de senha." });
    if (passwords.next.length < 8) return setMessage({ tone: "error", text: "A nova senha deve ter pelo menos 8 caracteres." });
    if (passwords.next !== passwords.confirmation) return setMessage({ tone: "error", text: "As senhas não coincidem." });
    const supabase = createClient();
    if (!supabase) return setMessage({ tone: "error", text: "Supabase não configurado." });
    setLoading(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const authenticatedEmail = userData.user?.email;
    if (userError || !authenticatedEmail) {
      setLoading(false);
      return setMessage({ tone: "error", text: "Sua sessão expirou. Entre novamente para alterar a senha." });
    }
    const { error: reauthenticationError } = await supabase.auth.signInWithPassword({ email: authenticatedEmail, password: passwords.current });
    if (reauthenticationError) {
      setLoading(false);
      return setMessage({ tone: "error", text: "Senha atual incorreta." });
    }
    const { error } = await supabase.auth.updateUser({ password: passwords.next, current_password: passwords.current });
    setLoading(false);
    if (error) return setMessage({ tone: "error", text: error.code === "current_password_mismatch" ? "Senha atual incorreta." : "Não foi possível alterar a senha. Verifique os requisitos e tente novamente." });
    setPasswords(emptyPasswords);
    setMessage({ tone: "success", text: "Senha alterada com sucesso." });
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-3"><span className="rounded-xl bg-teal-50 p-2 text-teal-700"><KeyRound className="size-5"/></span><div><h2 className="font-bold">Segurança da conta</h2><p className="text-xs text-slate-500">Altere somente a senha da sua conta autenticada.</p></div></div>
    <div className="mt-4 rounded-xl bg-slate-50 p-3"><span className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Mail className="size-4"/>E-mail da conta autenticada</span><p className="mt-1 break-all text-sm text-slate-800">{email || "Carregando..."}</p></div>
    <form onSubmit={changePassword} className="mt-4 space-y-4">
      {([['current','Senha atual'],['next','Nova senha'],['confirmation','Confirmar nova senha']] as const).map(([key,label])=><label key={key} className="block text-xs font-semibold text-slate-600">{label}<input name={key} autoComplete={key === "current" ? "current-password" : "new-password"} type="password" required minLength={key === "current" ? undefined : 8} value={passwords[key]} onChange={event=>setPasswords({...passwords,[key]:event.target.value})} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"/></label>)}
      {message&&<p role="status" className={`rounded-xl p-3 text-sm ${message.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{message.text}</p>}
      <button disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{loading&&<Loader2 className="size-4 animate-spin"/>}{loading ? "Alterando..." : "Alterar senha"}</button>
    </form>
  </section>;
}
