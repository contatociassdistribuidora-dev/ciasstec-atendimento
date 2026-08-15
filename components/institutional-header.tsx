"use client";

import Link from "next/link";
import { Menu, MonitorCog, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/#servicos", label: "Serviços" },
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
];

export function InstitutionalHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="CIASSTEC — Página inicial">
          <span className="grid size-10 place-items-center rounded-xl bg-teal-700 text-white shadow-lg shadow-teal-900/15">
            <MonitorCog className="size-5" aria-hidden="true" />
          </span>
          <span>
            <strong className="block text-base leading-none tracking-[0.12em] text-slate-950">CIASSTEC</strong>
            <span className="mt-1 block text-[0.65rem] font-medium uppercase tracking-[0.15em] text-slate-500">Assistência técnica</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Navegação principal">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-slate-600 transition hover:text-teal-700">
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800">
            Acessar atendimento
          </Link>
        </nav>

        <button
          type="button"
          className="grid size-11 place-items-center rounded-xl border border-slate-200 text-slate-800 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <nav id="mobile-navigation" className="border-t border-slate-200 bg-white px-5 py-5 md:hidden" aria-label="Navegação móvel">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-800">
                {link.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="mt-2 rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white">
              Acessar atendimento
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
