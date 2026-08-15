import Link from "next/link";
import { Mail, MessageCircle, MonitorCog } from "lucide-react";
import { company } from "@/lib/company";

const footerLinks = [
  { href: "/", label: "Início" },
  { href: "/#servicos", label: "Serviços" },
  { href: "/contato", label: "Contato" },
  { href: "/politica-de-privacidade", label: "Política de Privacidade" },
  { href: "/termos", label: "Termos de Uso" },
  { href: "/login", label: "Acessar Atendimento" },
];

export function InstitutionalFooter() {
  return (
    <footer className="bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.2fr_0.8fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-teal-500 text-slate-950"><MonitorCog className="size-5" /></span>
            <strong className="tracking-[0.14em]">{company.name}</strong>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">{company.segment}. Atendimento organizado, diagnóstico claro e suporte em tecnologia.</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-300">Navegação</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
            {footerLinks.map((link) => <li key={link.href}><Link href={link.href} className="transition hover:text-white">{link.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-300">Contato</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-400">
            <a href={company.contactWhatsAppUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 transition hover:text-white"><MessageCircle className="size-4 text-teal-400" />{company.footerPhone}</a>
            <a href={`mailto:${company.primaryEmail}`} className="flex items-center gap-3 break-all transition hover:text-white"><Mail className="size-4 shrink-0 text-teal-400" />{company.primaryEmail}</a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {company.name}. Todos os direitos reservados.
      </div>
    </footer>
  );
}
