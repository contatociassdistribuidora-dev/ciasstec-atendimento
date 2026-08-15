"use client";
/* eslint-disable @next/next/no-img-element -- QR Code efêmero em data URL local. */

import { useCallback, useEffect, useState } from "react";
import { Link2, Loader2, RefreshCw } from "lucide-react";
import { LOCAL_WHATSAPP_URL, localWhatsAppFetch } from "@/lib/local-whatsapp";

type ConnectorState = "offline" | "qr_required" | "connecting" | "connected" | "error";
type QrResponse = { connected?: boolean; state?: string; qr?: string | null };
const labels: Record<ConnectorState, string> = { offline: "Offline", qr_required: "Aguardando QR Code", connecting: "Conectando", connected: "Conectado", error: "Erro" };

function mapState(body: QrResponse): ConnectorState {
  if (body.connected || body.state === "online") return "connected";
  if (body.state === "qr_required") return "qr_required";
  if (["starting", "authenticated", "connecting"].includes(body.state ?? "")) return "connecting";
  if (body.state === "error") return "error";
  return "offline";
}

export function LocalWhatsAppCard() {
  const [state, setState] = useState<ConnectorState>("offline");
  const [qr, setQr] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true); setMessage("");
    try {
      const health = await localWhatsAppFetch("/health");
      if (!health.ok) throw new Error("health");
      const response = await localWhatsAppFetch("/qr");
      if (!response.ok) {
        if (response.status === 401) { setState("error"); setMessage("Informe o token local correto para acessar o conector."); return; }
        throw new Error("qr");
      }
      const body = await response.json() as QrResponse;
      const nextState = mapState(body);
      setState(nextState);
      setQr(nextState === "qr_required" && body.qr?.startsWith("data:image/png;base64,") ? body.qr : null);
    } catch {
      setState("offline"); setQr(null);
      setMessage("Não foi possível acessar o conector WhatsApp instalado neste computador. Verifique se o serviço local está executando e permita acesso à rede local no navegador.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { setToken(localStorage.getItem("ciasstec_whatsapp_local_token") ?? ""); void refresh(); }, [refresh]);
  function saveToken() { const value = token.trim(); if (value) localStorage.setItem("ciasstec_whatsapp_local_token", value); else localStorage.removeItem("ciasstec_whatsapp_local_token"); void refresh(); }

  return <section className="mt-4 rounded-xl border border-slate-200 p-4" aria-labelledby="whatsapp-local-title">
    <div className="flex flex-wrap items-start gap-3"><span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><Link2 className="size-4"/></span><div className="min-w-0 flex-1"><b id="whatsapp-local-title" className="block text-sm">WhatsApp Web Local</b><span className={`text-xs ${state === "connected" ? "text-emerald-700" : state === "qr_required" || state === "connecting" ? "text-amber-700" : state === "error" ? "text-rose-700" : "text-slate-500"}`}>● {labels[state]}</span></div><button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-teal-200 px-3 py-2 text-xs font-semibold text-teal-700 disabled:opacity-60">{loading ? <Loader2 className="size-4 animate-spin"/> : <RefreshCw className="size-4"/>}Atualizar status</button></div>
    <dl className="mt-3 text-xs text-slate-600"><dt className="font-semibold">Endereço</dt><dd>{LOCAL_WHATSAPP_URL}</dd></dl>
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"><label className="flex-1 text-xs font-semibold text-slate-600">Token local opcional<input type="password" autoComplete="off" value={token} onChange={event => setToken(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3"/></label><button type="button" onClick={saveToken} className="h-9 rounded-lg bg-teal-600 px-3 text-xs font-semibold text-white">Salvar localmente</button></div>
    {message && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{message}</p>}
    {state === "qr_required" && qr && <div className="mt-4 rounded-xl bg-slate-50 p-4 text-center"><p className="mb-3 text-xs text-slate-600">Abra o WhatsApp Business → Aparelhos conectados → Conectar aparelho e escaneie este QR Code.</p><img src={qr} alt="QR Code para conectar o WhatsApp Business" className="mx-auto size-64 max-w-full"/></div>}
  </section>;
}
