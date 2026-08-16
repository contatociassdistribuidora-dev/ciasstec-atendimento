"use client";

import { useCallback, useEffect, useState } from "react";

export const LOCAL_AI_URL = "http://127.0.0.1:8090";
const STATUS_TIMEOUT_MS = 2_000;
const GENERATION_TIMEOUT_MS = 45_000;

export type LocalAiState = "checking" | "online" | "offline";
export type ConversationMessage = { role: "cliente" | "atendente"; text: string };
type Health = { status?: string; model_found?: boolean; llama_online?: boolean };
export type ChatSource = { titulo: string; categoria: string; fabricante?: string | null; modelo?: string | null; tipo_documento?: string | null; pagina?: number | null };
type ChatResult = { answer: string; sources?: ChatSource[] };

async function fetchWithTimeout(path: string, timeout: number, init?: RequestInit) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(`${LOCAL_AI_URL}${path}`, { ...init, cache: "no-store", signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function checkLocalAi(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout("/health", STATUS_TIMEOUT_MS);
    if (!response.ok) return false;
    const health = await response.json() as Health;
    return health.status === "ok" && health.model_found === true && health.llama_online === true;
  } catch {
    return false;
  }
}

export function useLocalAiStatus(refreshMs = 15_000) {
  const [state, setState] = useState<LocalAiState>("checking");
  const refresh = useCallback(async () => setState(await checkLocalAi() ? "online" : "offline"), []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), refreshMs);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [refresh, refreshMs]);
  return { state, refresh };
}

function compact(text: string, max = 500) {
  return text
    .replace(/\bBearer\s+\S+/gi, "Bearer [removido]")
    .replace(/\b(senha|password|token|chave|secret|authorization)\s*[:=]\s*\S+/gi, "$1: [removido]")
    .replace(/\bsk-[A-Za-z0-9_-]+/g, "[credencial removida]")
    .replace(/\s+/g, " ").trim().slice(0, max);
}

export async function generateLocalAiSuggestion(input: {
  customerName: string;
  messages: ConversationMessage[];
  equipment?: string;
  reportedIssue?: string;
}) {
  const recent = input.messages.filter(message => message.text.trim()).slice(-5);
  const latestCustomer = [...recent].reverse().find(message => message.role === "cliente");
  if (!latestCustomer) throw new Error("Nenhuma mensagem recente do cliente foi encontrada.");
  const context = recent.map(message => `${message.role === "cliente" ? "Cliente" : "Atendente"}: ${compact(message.text)}`).join("\n");
  const details = [
    `Cliente: ${compact(input.customerName, 100)}`,
    input.equipment ? `Equipamento: ${compact(input.equipment, 160)}` : "",
    input.reportedIssue ? `Defeito informado: ${compact(input.reportedIssue, 300)}` : "",
    `Contexto recente:\n${context}`,
    `Última mensagem do cliente: ${compact(latestCustomer.text)}`,
  ].filter(Boolean).join("\n\n");
  const ragQuery = [input.equipment, input.reportedIssue, latestCustomer.text].filter(Boolean).map(value=>compact(value as string, 300)).join(" ");
  try {
    const response = await fetchWithTimeout("/chat", GENERATION_TIMEOUT_MS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: details, mode: "ATENDIMENTO_CLIENTE", rag_query: ragQuery }),
    });
    const body = await response.json().catch(() => ({})) as Partial<ChatResult> & { error?: string };
    if (!response.ok || !body.answer) throw new Error(body.error || "A IA Local não conseguiu gerar uma resposta.");
    return body as ChatResult;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("A IA Local demorou para responder. Tente novamente.");
    }
    if (error instanceof TypeError) throw new Error("CIASSTEC IA Local não está disponível neste computador.");
    throw error;
  }
}
