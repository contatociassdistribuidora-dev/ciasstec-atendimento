"use client";

export const LOCAL_WHATSAPP_URL = "http://127.0.0.1:8091";
export type LocalWhatsAppStatus = { connected: boolean; state: string; phone?: string; lastConnectedAt?: string | null; sessionAvailable?: boolean };

function localToken() {
  const token = typeof window === "undefined" ? "" : localStorage.getItem("ciasstec_whatsapp_local_token") ?? "";
  return token;
}

export async function localWhatsAppFetch(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  const requestHeaders = new Headers(init.headers);
  const token = localToken();
  if (token) requestHeaders.set("X-CIASSTEC-Local-Token", token);
  try { return await fetch(`${LOCAL_WHATSAPP_URL}${path}`, { ...init, cache: "no-store", signal: controller.signal, headers: requestHeaders }); }
  finally { clearTimeout(timer); }
}

export async function getLocalWhatsAppStatus(): Promise<LocalWhatsAppStatus> {
  const response = await localWhatsAppFetch("/status");
  if (!response.ok) throw new Error(response.status === 401 ? "Token local inválido." : "Conector indisponível.");
  return response.json();
}
