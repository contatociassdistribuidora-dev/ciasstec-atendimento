import type { Metadata } from "next";
import { Globe2, Mail, MessageCircle } from "lucide-react";
import { InstitutionalShell } from "@/components/institutional-shell";
import { company } from "@/lib/company";

export const metadata: Metadata = { title: "Contato", description: "Entre em contato com a CIASSTEC para atendimento técnico em informática.", alternates: { canonical: "/contato" } };

export default function ContactPage() {
  return <InstitutionalShell><main><section className="bg-slate-950 px-5 py-20 text-white sm:px-8 sm:py-28"><div className="mx-auto max-w-4xl text-center"><p className="text-sm font-bold uppercase tracking-[0.2em] text-teal-300">Contato</p><h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-6xl">Fale com a {company.name}</h1><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">Use um dos nossos canais reais para solicitar informações ou atendimento técnico.</p></div></section><section className="px-5 py-16 sm:px-8 sm:py-24"><div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3"><ContactCard icon={MessageCircle} label="WhatsApp" value={company.contactPhone} href={company.contactWhatsAppUrl} external /><ContactCard icon={Mail} label="E-mail" value={company.contactEmail} href={`mailto:${company.contactEmail}`} /><ContactCard icon={Globe2} label="Site" value={company.siteLabel} href={company.site} external /></div><div className="mx-auto mt-10 max-w-5xl rounded-3xl bg-teal-50 p-8 text-center sm:p-12"><h2 className="text-2xl font-bold text-slate-950">Assistência Técnica em Informática</h2><p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-600">Entre em contato e informe sua necessidade. A equipe poderá orientar sobre os próximos passos do atendimento.</p><a href={company.contactWhatsAppUrl} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-full bg-teal-700 px-7 py-3.5 font-semibold text-white transition hover:bg-teal-800"><MessageCircle className="size-5" /> Chamar no WhatsApp</a></div></section></main></InstitutionalShell>;
}

function ContactCard({ icon: Icon, label, value, href, external = false }: { icon: typeof MessageCircle; label: string; value: string; href: string; external?: boolean }) {
  return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="rounded-3xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl"><span className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Icon className="size-6" /></span><p className="mt-5 text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 break-words font-bold text-slate-950">{value}</p></a>;
}
