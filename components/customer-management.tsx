"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string; name: string; phone: string; whatsapp: string | null; email: string | null;
  cpf: string | null; address: string | null; notes: string | null; created_by: string | null; created_at: string; updated_at: string;
};
type CustomerForm = { name: string; phone: string; whatsapp: string; email: string; cpf: string; address: string; notes: string };
const emptyForm: CustomerForm = { name: "", phone: "", whatsapp: "", email: "", cpf: "", address: "", notes: "" };

function errorMessage(error: { message: string; code?: string; details?: string; hint?: string }) {
  return [error.code ? `[${error.code}]` : "", error.message, error.details, error.hint].filter(Boolean).join(" — ");
}

export function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCustomers = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) { setError("Supabase não configurado."); setLoading(false); return; }
    setLoading(true); setError("");
    const { data, error } = await supabase.from("customers").select("id,name,phone,whatsapp,email,cpf,address,notes,created_by,created_at,updated_at").order("created_at", { ascending: false });
    if (error) setError(errorMessage(error)); else setCustomers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void loadCustomers(); }, [loadCustomers]);

  const visible = useMemo(() => { const term=query.trim().toLocaleLowerCase("pt-BR"); return !term ? customers : customers.filter((c) => [c.name,c.phone,c.email,c.whatsapp].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term))); }, [customers, query]);

  function startCreate() { setEditing(null); setForm(emptyForm); setError(""); setSuccess(""); setOpen(true); }
  function startEdit(customer: Customer) { setEditing(customer); setForm({ name:customer.name, phone:customer.phone, whatsapp:customer.whatsapp??"", email:customer.email??"", cpf:customer.cpf??"", address:customer.address??"", notes:customer.notes??"" }); setError(""); setSuccess(""); setOpen(true); }
  function closeModal() { if (!saving) { setOpen(false); setEditing(null); } }
  function updateField(field: keyof CustomerForm, value: string) { setForm((current) => ({ ...current, [field]: value })); }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const supabase=createClient(); if(!supabase){setError("Supabase não configurado.");return;}
    setSaving(true); setError(""); setSuccess("");
    const payload = { name:form.name.trim(), phone:form.phone.trim(), whatsapp:form.whatsapp.trim()||null, email:form.email.trim()||null, cpf:form.cpf.trim()||null, address:form.address.trim()||null, notes:form.notes.trim()||null };
    if (!payload.name || !payload.phone) { setError("Nome e telefone são obrigatórios."); setSaving(false); return; }
    if (editing) {
      const { data, error } = await supabase.from("customers").update(payload).eq("id", editing.id).select("id,name,phone,whatsapp,email,cpf,address,notes,created_by,created_at,updated_at").single();
      if (error) setError(errorMessage(error)); else { setCustomers((items)=>items.map((item)=>item.id===data.id?data:item)); setSuccess("Cliente atualizado com sucesso"); setOpen(false); setEditing(null); }
    } else {
      const { data:authData, error:authError } = await supabase.auth.getUser();
      if (authError || !authData.user) { setError(authError ? errorMessage(authError) : "Sessão expirada. Entre novamente."); setSaving(false); return; }
      const { data, error } = await supabase.from("customers").insert({ ...payload, created_by:authData.user.id }).select("id,name,phone,whatsapp,email,cpf,address,notes,created_by,created_at,updated_at").single();
      if (error) setError(errorMessage(error)); else { setCustomers((items)=>[data,...items]); setSuccess("Cliente cadastrado com sucesso"); setOpen(false); }
    }
    setSaving(false);
  }

  async function deleteCustomer(customer: Customer) {
    if (!window.confirm(`Excluir o cliente ${customer.name}? Esta ação não pode ser desfeita.`)) return;
    const supabase=createClient(); if(!supabase){setError("Supabase não configurado.");return;}
    setError(""); setSuccess("");
    const { error } = await supabase.from("customers").delete().eq("id", customer.id);
    if (error) setError(errorMessage(error)); else { setCustomers((items)=>items.filter((item)=>item.id!==customer.id)); setSuccess("Cliente excluído com sucesso"); }
  }

  return <div className="page-enter space-y-5">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Clientes</h1><p className="mt-1 text-sm text-slate-500">Cadastre e acompanhe seus clientes no Supabase</p></div><button onClick={startCreate} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"><Plus className="size-4"/>Novo cliente</button></div>
    {success&&<div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800"><CheckCircle2 className="size-5"/>{success}<button aria-label="Fechar mensagem" onClick={()=>setSuccess("")} className="ml-auto"><X className="size-4"/></button></div>}
    {error&&!open&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><b>Erro do Supabase:</b> {error}</div>}
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-4"><label className="relative block max-w-md"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(e)=>setQuery(e.target.value)} aria-label="Pesquisar clientes" placeholder="Pesquisar por nome, telefone ou e-mail" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-teal-500"/></label></div>
      {loading?<div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle className="size-5 animate-spin"/>Carregando clientes...</div>:visible.length===0?<div className="grid place-items-center p-12 text-center"><Users className="mb-3 size-9 text-slate-300"/><b className="text-slate-700">Nenhum cliente encontrado</b><p className="mt-1 text-sm text-slate-500">Cadastre o primeiro cliente para começar.</p></div>:<div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Cliente","Contato","Cadastro","Ações"].map((label)=><th key={label} className="px-5 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{visible.map((customer)=><tr key={customer.id} className="border-t border-slate-100 hover:bg-slate-50/60"><td className="px-5 py-4 font-semibold">{customer.name}</td><td className="px-5 py-4"><p>{customer.phone}</p><p className="text-xs text-slate-500">{customer.email||customer.whatsapp||"Sem contato adicional"}</p></td><td className="px-5 py-4 text-slate-500">{new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium"}).format(new Date(customer.created_at))}</td><td className="px-5 py-4"><div className="flex gap-2"><button onClick={()=>startEdit(customer)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-semibold text-teal-700 hover:bg-teal-50"><Pencil className="size-3.5"/>Editar</button><button onClick={()=>void deleteCustomer(customer)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="size-3.5"/>Excluir</button></div></td></tr>)}</tbody></table></div>}
    </div>
    {open&&<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 p-5"><h2 className="text-lg font-bold">{editing?"Editar cliente":"Cadastrar cliente"}</h2><button onClick={closeModal} aria-label="Fechar"><X className="size-5"/></button></div><form onSubmit={saveCustomer} className="p-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome completo" required value={form.name} onChange={(v)=>updateField("name",v)}/><Field label="Telefone" required value={form.phone} onChange={(v)=>updateField("phone",v)}/><Field label="WhatsApp" value={form.whatsapp} onChange={(v)=>updateField("whatsapp",v)}/><Field label="E-mail" type="email" value={form.email} onChange={(v)=>updateField("email",v)}/><Field label="CPF (opcional)" value={form.cpf} onChange={(v)=>updateField("cpf",v)}/><Field label="Endereço (opcional)" value={form.address} onChange={(v)=>updateField("address",v)}/></div><label className="mt-4 block text-xs font-semibold text-slate-600">Observações<textarea value={form.notes} onChange={(e)=>updateField("notes",e.target.value)} className="mt-1 h-20 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-500"/></label>{error&&<div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><b>Erro do Supabase:</b> {error}</div>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Cancelar</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving&&<LoaderCircle className="size-4 animate-spin"/>}{editing?"Salvar alterações":"Cadastrar cliente"}</button></div></form></div></div>}
  </div>;
}

function Field({label,value,onChange,required=false,type="text"}:{label:string;value:string;onChange:(value:string)=>void;required?:boolean;type?:string}) {
  return <label className="text-xs font-semibold text-slate-600">{label}<input name={label} type={type} required={required} value={value} onChange={(e)=>onChange(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"/></label>;
}
