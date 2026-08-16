"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("error");
    if (reason === "config") setError("Configure as variáveis públicas do Supabase no arquivo .env.local.");
    if (reason === "inactive") setError("Seu acesso está desativado. Entre em contato com o administrador.");
    if (reason === "profile") setError("O perfil do usuário não foi encontrado. Execute o SQL de configuração e tente novamente.");
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const data = new FormData(event.currentTarget); const supabase = createClient();
    if (!supabase) { setError("Configure as variáveis do Supabase para ativar o login."); setLoading(false); return; }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: String(data.get("email")), password: String(data.get("password")) });
    if (signInError) { setError("E-mail ou senha inválidos."); setLoading(false); return; }
    window.location.replace("/dashboard");
  }

  async function recover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setRecoveryMessage("");
    const supabase = createClient();
    if (supabase) await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), { redirectTo: `${window.location.origin}/redefinir-senha` });
    setLoading(false);
    setRecoveryMessage("Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha.");
  }

  return <main className="grid min-h-screen bg-[var(--ciass-light)] lg:grid-cols-2">
    <section className="hidden bg-[var(--ciass-navy)] p-12 text-white lg:flex lg:flex-col lg:justify-between"><div className="flex items-center gap-3"><Image src="/favicon.svg" width={48} height={48} alt="Logomarca CIASSTEC" className="size-12 rounded-xl bg-white p-2 object-contain"/><div><b className="block text-lg tracking-wide">CIASSTEC</b><span className="text-xs text-blue-100/60">Gestão & Atendimento</span></div></div><div className="max-w-lg"><p className="mb-5 text-sm font-semibold uppercase tracking-[.2em] text-orange-300">Assistência técnica e loja</p><h1 className="text-5xl font-bold leading-tight">Tecnologia, organização e atendimento em uma só operação.</h1><p className="mt-6 text-lg leading-relaxed text-blue-50/65">Gerencie conversas, equipamentos, ordens de serviço, produtos e estoque.</p></div><p className="text-xs text-blue-50/40">© 2026 CIASSTEC • Recife, Pernambuco</p></section>
    <section className="flex items-center justify-center p-6"><div className="w-full max-w-md"><div className="mb-8 lg:hidden"><Image src="/favicon.svg" width={56} height={56} alt="Logomarca CIASSTEC" className="size-14 rounded-xl bg-white p-2 shadow"/></div><h2 className="text-3xl font-bold tracking-tight text-slate-900">{recovering ? "Redefina sua senha" : "Acesse sua conta"}</h2><p className="mt-2 text-sm text-slate-500">{recovering ? "Informe o e-mail associado à sua conta." : "Entre com seu e-mail de administrador ou atendente."}</p>
      {recovering ? <form onSubmit={recover} className="mt-8 space-y-5"><label className="block text-sm font-semibold text-slate-700">E-mail<div className="relative mt-2"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input value={recoveryEmail} onChange={event=>setRecoveryEmail(event.target.value)} type="email" required autoComplete="email" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"/></div></label>{recoveryMessage&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{recoveryMessage}</p>}<button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 font-semibold text-white disabled:opacity-60">{loading&&<LoaderCircle className="size-4 animate-spin"/>}Enviar instruções</button><button type="button" onClick={()=>{setRecovering(false);setRecoveryMessage("")}} className="w-full text-sm font-semibold text-teal-700">Voltar ao login</button></form>
      : <form onSubmit={login} className="mt-8 space-y-5"><label className="block text-sm font-semibold text-slate-700">E-mail<div className="relative mt-2"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input name="email" type="email" required autoComplete="email" placeholder="voce@ciasstec.com.br" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"/></div></label><label className="block text-sm font-semibold text-slate-700">Senha<div className="relative mt-2"><LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input name="password" type={show?"text":"password"} required autoComplete="current-password" placeholder="••••••••" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"/><button type="button" aria-label={show ? "Ocultar senha" : "Mostrar senha"} onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{show?<EyeOff className="size-4"/>:<Eye className="size-4"/>}</button></div></label>{error&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}<button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 font-semibold text-white shadow-lg shadow-teal-600/15 hover:bg-teal-700 disabled:opacity-60">{loading&&<LoaderCircle className="size-4 animate-spin"/>}Entrar</button><button type="button" onClick={()=>setRecovering(true)} className="w-full text-sm font-semibold text-teal-700">Esqueci minha senha</button></form>}
      <p className="mt-8 text-center text-xs text-slate-400">Precisa de acesso? Fale com o administrador.</p></div></section>
  </main>;
}
