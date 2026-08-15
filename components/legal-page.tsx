import type { ReactNode } from "react";
import { InstitutionalShell } from "@/components/institutional-shell";

export function LegalPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return <InstitutionalShell><main><section className="bg-slate-950 px-5 py-16 text-white sm:px-8 sm:py-24"><div className="mx-auto max-w-4xl"><p className="text-sm font-bold uppercase tracking-[0.2em] text-teal-300">{eyebrow}</p><h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-6xl">{title}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">{intro}</p></div></section><section className="px-5 py-14 sm:px-8 sm:py-20"><article className="legal-content mx-auto max-w-4xl">{children}</article></section></main></InstitutionalShell>;
}
