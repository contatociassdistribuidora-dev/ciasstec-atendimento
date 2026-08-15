"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Bot, CheckCircle2, Loader2, Mail, MessageCircle, X, XCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LocalAiStatus } from "@/components/local-ai-status";
import { LocalWhatsAppCard } from "@/components/local-whatsapp-card";

type Status = {
  whatsapp: { configured: boolean; accessToken: boolean; phoneNumberId: boolean; verifyToken: boolean };
  openai: { configured: boolean };
  gmail: { configured: boolean; clientId: boolean; clientSecret: boolean };
};
type Integration = "whatsapp" | "openai" | "gmail";

const emptyForm = { company_name: "", email: "", whatsapp: "", address: "" };

function Flag({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <li className="flex items-center gap-2 text-sm">{ok ? <CheckCircle2 className="size-4 text-emerald-600"/> : <XCircle className="size-4 text-amber-600"/>}<span>{children}: {ok ? "sim" : "não"}</span></li>;
}

export function SettingsManagement({ canEdit }: { canEdit: boolean }) {
  const [form, setForm] = useState(emptyForm);
  const [id, setId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [statusError, setStatusError] = useState("");
  const [modal, setModal] = useState<Integration | null>(null);
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      if (!supabase) {
        setMessage({ tone: "error", text: "Supabase não configurado." });
        setLoading(false);
        return;
      }
      const [{ data, error }, statusResponse] = await Promise.all([
        supabase.from("company_settings").select("id, company_name, email, whatsapp, address").maybeSingle(),
        canEdit ? fetch("/api/admin/integrations/status", { cache: "no-store" }) : Promise.resolve(null),
      ]);
      if (error) setMessage({ tone: "error", text: `Não foi possível carregar: ${error.message}` });
      else if (data) {
        setId(data.id);
        setForm({ company_name: data.company_name, email: data.email, whatsapp: data.whatsapp, address: data.address ?? "" });
      }
      if (statusResponse?.ok) setStatus(await statusResponse.json());
      else if (statusResponse) setStatusError((await statusResponse.json()).error ?? "Não foi possível consultar as integrações.");
      setLoading(false);
    }
    void load();
  }, [canEdit]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!canEdit) return setMessage({ tone: "error", text: "Somente administradores podem alterar estas configurações." });
    setMessage(null);
    if (!form.company_name.trim() || !form.email.trim() || !form.whatsapp.trim()) {
      setMessage({ tone: "error", text: "Preencha nome, e-mail e WhatsApp." });
      return;
    }
    const supabase = createClient();
    if (!supabase) return setMessage({ tone: "error", text: "Supabase não configurado." });
    setSaving(true);
    const payload = { ...form, address: form.address.trim() || null };
    const query = id
      ? supabase.from("company_settings").update(payload).eq("id", id).select("id").single()
      : supabase.from("company_settings").insert(payload).select("id").single();
    const { data, error } = await query;
    setSaving(false);
    if (error) setMessage({ tone: "error", text: `Não foi possível salvar: ${error.message}` });
    else {
      setId(data.id);
      setMessage({ tone: "success", text: "Configurações salvas com sucesso." });
    }
  }

  async function testOpenAI() {
    setTestMessage("Testando...");
    const response = await fetch("/api/admin/integrations/openai/test", { method: "POST" });
    const body = await response.json();
    setTestMessage(body.message ?? body.error ?? "Teste concluído.");
  }

  function groupedStatus(values: Array<boolean | undefined>) {
    const configured = values.filter(Boolean).length;
    if (configured === values.length) return "Configurado";
    return configured === 0 ? "Não configurado" : "Configuração incompleta";
  }

  const cards = [
    { id: "whatsapp" as const, name: "WhatsApp Business", icon: MessageCircle, state: groupedStatus([status?.whatsapp.accessToken,status?.whatsapp.phoneNumberId,status?.whatsapp.verifyToken]) },
    { id: "openai" as const, name: "OpenAI", icon: Bot, state: status?.openai.configured ? "Configurado" : "Não configurado" },
    { id: "gmail" as const, name: "Gmail", icon: Mail, state: groupedStatus([status?.gmail.clientId,status?.gmail.clientSecret]) },
  ];

  return <div className="page-enter space-y-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Configurações</h1><p className="mt-1 text-sm text-slate-500">Dados da empresa e estado das integrações do servidor</p></div>{canEdit&&<Link href="/configuracoes/atendentes" className="inline-flex h-10 items-center justify-center rounded-xl border border-teal-200 bg-white px-4 text-sm font-semibold text-teal-700 hover:bg-teal-50">Gerenciar atendentes</Link>}</div>
    {loading ? <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500"><Loader2 className="size-4 animate-spin"/>Carregando configurações...</div> :
    <div className="grid gap-5 xl:grid-cols-2">
      <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">Dados da empresa</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {([['company_name','Nome da empresa','text'],['email','E-mail','email'],['whatsapp','WhatsApp Business','tel'],['address','Endereço','text']] as const).map(([key,label,type])=><label key={key} className="text-xs font-semibold text-slate-600">{label}<input disabled={!canEdit} type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500"/></label>)}
        </div>
        {message&&<p role="status" className={`mt-4 rounded-xl p-3 text-sm ${message.tone==="success"?"bg-emerald-50 text-emerald-700":"bg-rose-50 text-rose-700"}`}>{message.text}</p>}
        {canEdit ? <button disabled={saving} className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{saving&&<Loader2 className="size-4 animate-spin"/>}{saving?"Salvando...":"Salvar alterações"}</button> : <p className="mt-4 text-xs text-slate-500">Visualização somente leitura. Alterações são restritas a administradores.</p>}
      </form>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">Integrações</h2>
        <div className="mt-4"><LocalAiStatus detailed/></div>
        {canEdit&&<LocalWhatsAppCard/>}
        {!canEdit&&<p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Os detalhes das integrações são restritos a administradores.</p>}
        {statusError&&<p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{statusError}</p>}
        {canEdit&&<div className="mt-4 space-y-3">{cards.map(card=>{const Icon=card.icon; return <button type="button" key={card.id} onClick={()=>{setModal(card.id);setTestMessage("")}} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/40"><span className="rounded-lg bg-slate-100 p-2"><Icon className="size-4"/></span><span className="flex-1"><b className="block text-sm">{card.name}</b><span className={`text-xs ${card.state==="Configurado"?"text-emerald-700":card.state==="Não configurado"?"text-slate-500":"text-amber-700"}`}>● {card.state}</span></span><span className="text-xs font-semibold text-teal-700">Detalhes</span></button>})}</div>}
        <p className="mt-4 text-xs text-slate-500">Somente a presença das variáveis no servidor é exibida. Valores secretos nunca são enviados ao navegador.</p>
      </section>
    </div>}
    {modal&&status&&<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold">{cards.find(c=>c.id===modal)?.name}</h2><p className="text-sm text-slate-500">Status seguro da configuração no servidor</p></div><button aria-label="Fechar" onClick={()=>setModal(null)} className="rounded-lg p-2 hover:bg-slate-100"><X className="size-5"/></button></div><ul className="mt-5 space-y-3">
      {modal==="whatsapp"&&<><Flag ok={status.whatsapp.accessToken}>Token de acesso presente</Flag><Flag ok={status.whatsapp.phoneNumberId}>ID do telefone presente</Flag><Flag ok={status.whatsapp.verifyToken}>Token de verificação presente</Flag><Flag ok={true}>Webhook disponível em /api/webhooks/whatsapp</Flag><li className="text-sm text-slate-600">Número oficial: +55 (81) 98385-7466</li><li className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">A integração com a Meta permanece pausada; nenhuma inscrição é feita automaticamente.</li></>}
      {modal==="openai"&&<><li className="text-sm text-slate-600">A OpenAI será usada para gerar sugestões de resposta para os atendentes.</li><Flag ok={status.openai.configured}>Chave da OpenAI presente</Flag><li><button onClick={testOpenAI} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">Testar configuração</button></li>{testMessage&&<li className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{testMessage}</li>}</>}
      {modal==="gmail"&&<><Flag ok={status.gmail.clientId}>Google Client ID presente</Flag><Flag ok={status.gmail.clientSecret}>Google Client Secret presente</Flag></>}
    </ul></div></div>}
  </div>;
}
