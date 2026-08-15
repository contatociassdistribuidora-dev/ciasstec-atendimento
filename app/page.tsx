import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight, BadgeCheck, CheckCircle2, ChevronRight, ClipboardCheck, Computer,
  HardDrive, Headphones, Laptop, MessageCircle, Network, Printer, SearchCheck,
  ShieldCheck, Sparkles, Wrench,
} from "lucide-react";
import { InstitutionalShell } from "@/components/institutional-shell";
import { company } from "@/lib/company";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const services = [
  { icon: Computer, title: "Computadores", items: ["Manutenção", "Diagnóstico", "Upgrades", "Limpeza preventiva", "Instalação e configuração"] },
  { icon: Laptop, title: "Notebooks", items: ["Diagnóstico", "Manutenção", "Troca de peças", "SSD e memória", "Configuração de sistema"] },
  { icon: Printer, title: "Impressoras", items: ["Diagnóstico", "Configuração", "Manutenção", "Instalação", "Problemas de impressão"] },
  { icon: Network, title: "Redes", items: ["Configuração de redes", "Wi-Fi", "Roteadores", "Compartilhamento", "Diagnóstico de conectividade"] },
  { icon: HardDrive, title: "Windows e Software", items: ["Instalação e configuração", "Diagnóstico de problemas", "Otimização", "Drivers", "Aplicativos"] },
  { icon: Headphones, title: "Suporte Técnico", items: ["Suporte presencial", "Orientação técnica", "Diagnóstico", "Orçamento"] },
];

const steps = [
  [MessageCircle, "Contato", "O cliente entra em contato."],
  [ClipboardCheck, "Informações", "O problema é informado."],
  [SearchCheck, "Análise", "O equipamento é analisado."],
  [BadgeCheck, "Orçamento", "O orçamento é preparado."],
  [CheckCircle2, "Aprovação", "O cliente avalia e aprova."],
  [Wrench, "Serviço", "O serviço é realizado."],
  [Sparkles, "Entrega", "O equipamento é entregue."],
] as const;

export default function Home() {
  return (
    <InstitutionalShell>
      <main>
        <section className="relative isolate overflow-hidden bg-slate-950 text-white">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_25%,rgba(20,184,166,0.22),transparent_34%),radial-gradient(circle_at_15%_80%,rgba(14,116,144,0.18),transparent_30%)]" />
          <div className="absolute inset-0 -z-10 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.9)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="mx-auto grid min-h-[690px] max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:py-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/25 bg-teal-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200"><span className="size-1.5 rounded-full bg-teal-400" /> {company.name}</div>
              <h1 className="mt-7 max-w-3xl text-4xl font-bold leading-[1.08] tracking-[-0.04em] sm:text-6xl lg:text-7xl">Assistência Técnica <span className="text-teal-300">em Informática</span></h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">Soluções para computadores, notebooks, impressoras, redes e tecnologia.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href={company.heroWhatsAppUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-teal-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-teal-300"><MessageCircle className="size-5" /> Falar pelo WhatsApp</a>
                <Link href="/login" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10">Acessar Atendimento <ArrowRight className="size-4" /></Link>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:ml-auto">
              <div className="absolute -inset-5 rounded-[2.5rem] bg-teal-400/10 blur-2xl" />
              <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-sm sm:p-7">
                <div className="flex items-center justify-between border-b border-white/10 pb-5"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">Atendimento técnico</p><p className="mt-1 text-sm text-slate-400">Da análise à entrega</p></div><span className="grid size-11 place-items-center rounded-2xl bg-teal-400 text-slate-950"><Wrench className="size-5" /></span></div>
                <div className="mt-5 space-y-3">
                  {["Diagnóstico organizado", "Orçamento para aprovação", "Acompanhamento do serviço"].map((item, index) => <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-400/15 text-sm font-bold text-teal-300">0{index + 1}</span><span className="text-sm font-medium text-slate-200">{item}</span><CheckCircle2 className="ml-auto size-4 text-teal-400" /></div>)}
                </div>
                <div className="mt-5 rounded-2xl bg-teal-400 p-5 text-slate-950"><p className="text-xs font-bold uppercase tracking-[0.16em]">Tecnologia com clareza</p><p className="mt-2 text-sm leading-6 text-slate-800">Atendimento técnico com organização, transparência e cuidado em cada etapa.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section id="servicos" className="scroll-mt-24 bg-slate-50 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <SectionHeading eyebrow="Soluções técnicas" title="Nossos Serviços" text="Atendimento para as necessidades mais comuns de informática, sempre a partir de uma avaliação técnica." />
            <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {services.map(({ icon: Icon, title, items }) => <article key={title} className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl hover:shadow-slate-200/60"><span className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-700 transition group-hover:bg-teal-700 group-hover:text-white"><Icon className="size-6" /></span><h3 className="mt-6 text-xl font-bold tracking-tight text-slate-950">{title}</h3><ul className="mt-4 space-y-2.5">{items.map((item) => <li key={item} className="flex items-center gap-2.5 text-sm text-slate-600"><ChevronRight className="size-3.5 text-teal-600" />{item}</li>)}</ul></article>)}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-24 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <SectionHeading eyebrow="Etapas do atendimento" title="Como funciona" text="Um fluxo claro para manter você informado do primeiro contato até a entrega." />
            <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map(([Icon, title, text], index) => <li key={title} className={`relative rounded-3xl border border-slate-200 p-6 ${index === 6 ? "bg-slate-950 text-white lg:col-start-3" : "bg-white"}`}><div className="flex items-center justify-between"><span className={`grid size-11 place-items-center rounded-2xl ${index === 6 ? "bg-teal-400 text-slate-950" : "bg-teal-50 text-teal-700"}`}><Icon className="size-5" /></span><span className={`text-xs font-bold ${index === 6 ? "text-teal-300" : "text-slate-300"}`}>{String(index + 1).padStart(2, "0")}</span></div><h3 className="mt-5 font-bold">{title}</h3><p className={`mt-2 text-sm leading-6 ${index === 6 ? "text-slate-300" : "text-slate-600"}`}>{text}</p></li>)}
            </ol>
          </div>
        </section>

        <section id="sobre" className="scroll-mt-24 bg-teal-950 py-20 text-white sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:items-center">
            <div><p className="text-sm font-bold uppercase tracking-[0.2em] text-teal-300">Sobre a CIASSTEC</p><h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] sm:text-5xl">Tecnologia tratada com atenção e clareza.</h2><p className="mt-6 text-base leading-8 text-teal-50/70">A CIASSTEC atua com assistência técnica, manutenção e suporte em tecnologia da informação. Cada atendimento é conduzido com organização, desde o registro da necessidade e diagnóstico até o acompanhamento do serviço.</p><p className="mt-4 text-base leading-8 text-teal-50/70">Nosso objetivo é oferecer orientação técnica compreensível e manter transparência ao longo do processo, respeitando os dados e os equipamentos confiados ao atendimento.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">{["Atendimento técnico", "Transparência", "Diagnóstico", "Segurança", "Organização", "Acompanhamento"].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5"><ShieldCheck className="size-5 shrink-0 text-teal-300" /><span className="text-sm font-semibold">{item}</span></div>)}</div>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:px-8 lg:grid-cols-2">
            <div className="rounded-[2rem] bg-slate-100 p-8 sm:p-10"><p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-700">Área de Atendimento</p><h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Organização para clientes e equipe.</h2><p className="mt-4 leading-7 text-slate-600">O sistema de atendimento apoia o acompanhamento e a gestão dos serviços, equipamentos e ordens de serviço.</p><Link href="/login" className="mt-7 inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-teal-800">Acessar sistema <ArrowRight className="size-4" /></Link></div>
            <div className="rounded-[2rem] bg-teal-400 p-8 text-slate-950 sm:p-10"><p className="text-sm font-bold uppercase tracking-[0.18em]">Entre em contato</p><h2 className="mt-4 text-3xl font-bold tracking-tight">Precisa de atendimento técnico?</h2><div className="mt-5 space-y-2 text-sm font-medium"><p>WhatsApp: {company.contactPhone}</p><p>E-mail: <a href={`mailto:${company.contactEmail}`} className="underline underline-offset-4">{company.contactEmail}</a></p><p>Site: {company.siteLabel}</p></div><a href={company.contactWhatsAppUrl} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"><MessageCircle className="size-5" /> Chamar no WhatsApp</a></div>
          </div>
        </section>
      </main>
    </InstitutionalShell>
  );
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.2em] text-teal-700">{eyebrow}</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-5xl">{title}</h2><p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{text}</p></div>;
}
