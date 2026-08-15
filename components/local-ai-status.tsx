"use client";

import { Bot, RefreshCw } from "lucide-react";
import { LOCAL_AI_URL, useLocalAiStatus } from "@/lib/local-ai";

export function LocalAiStatus({ detailed = false }: { detailed?: boolean }) {
  const { state, refresh } = useLocalAiStatus();
  const online = state === "online";
  return <div className={detailed ? "rounded-xl border border-slate-200 p-4" : "flex items-center gap-2"}>
    <div className="flex items-center gap-3">
      {detailed&&<span className="rounded-lg bg-violet-50 p-2 text-violet-700"><Bot className="size-4"/></span>}
      <div className="flex-1">
        <b className="block text-sm">CIASSTEC IA Local</b>
        <span role="status" className={`text-xs ${online ? "text-emerald-700" : state === "checking" ? "text-slate-500" : "text-amber-700"}`}>
          ● {state === "checking" ? "Verificando..." : online ? "Online" : "Offline"}
        </span>
      </div>
      {detailed&&<button type="button" onClick={()=>void refresh()} aria-label="Atualizar status da IA Local" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><RefreshCw className="size-4"/></button>}
    </div>
    {detailed&&<dl className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-3"><div><dt className="font-semibold">Endereço</dt><dd>{LOCAL_AI_URL}</dd></div><div><dt className="font-semibold">Modo</dt><dd>Local / Offline</dd></div><div><dt className="font-semibold">Modelo</dt><dd>Qwen3-4B-Q5_K_M</dd></div></dl>}
  </div>;
}
