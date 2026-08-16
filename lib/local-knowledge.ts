"use client";

import { LOCAL_AI_URL } from "@/lib/local-ai";

const TOKEN_KEY = "ciasstec_knowledge_admin_token";

export type KnowledgeDocument = {
  id: number; titulo: string | null; categoria: string | null; fabricante: string | null;
  modelo: string | null; tipo_documento: string | null; arquivo_original: string | null;
  arquivo_local: string | null; sha256: string; tamanho: number | null; numero_paginas: number | null;
  numero_chunks: number; data_importacao: string; status: string; descricao: string | null;
};
export type KnowledgeStatus = {
  ia_online: boolean;
  library: { online: boolean; documents: number; chunks: number; categories: number; manufacturers: number; bytes: number };
  reindex: { state: "idle" | "waiting" | "processing" | "completed" | "error"; error?: string | null };
};
export type SearchChunk = { id: number; titulo: string; categoria: string; fabricante?: string | null; modelo?: string | null; tipo_documento?: string | null; pagina?: number | null; secao?: string | null; conteudo: string; score: number };

export function getKnowledgeToken() { return typeof window === "undefined" ? "" : localStorage.getItem(TOKEN_KEY) ?? ""; }
export function saveKnowledgeToken(value: string) { const clean = value.trim(); if (clean) localStorage.setItem(TOKEN_KEY, clean); else localStorage.removeItem(TOKEN_KEY); }

async function request(path: string, init: RequestInit = {}, timeout = 15_000) {
  const controller = new AbortController(); const timer = window.setTimeout(() => controller.abort(), timeout);
  const headers = new Headers(init.headers); const token = getKnowledgeToken(); if (token) headers.set("X-CIASSTEC-Knowledge-Token", token);
  try {
    const response = await fetch(`${LOCAL_AI_URL}${path}`, { ...init, headers, cache: "no-store", signal: controller.signal });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((body as { error?: string }).error ?? "Falha na biblioteca local.");
    return body;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("A biblioteca local demorou para responder.");
    if (error instanceof TypeError) throw new Error("Biblioteca de conhecimento local indisponível. Verifique se o HD externo está conectado e se a CIASSTEC IA está em execução.");
    throw error;
  } finally { window.clearTimeout(timer); }
}

export async function getKnowledgeStatus() { return request("/knowledge/status") as Promise<KnowledgeStatus>; }
export async function getKnowledgeDocuments(params: URLSearchParams) { return request(`/knowledge/documents?${params}`) as Promise<{ documents: KnowledgeDocument[] }>; }
export async function getKnowledgeDocument(id: number) { return request(`/knowledge/documents/${id}`) as Promise<{ document: KnowledgeDocument }>; }
export async function importKnowledge(form: FormData) { return request("/knowledge/import", { method: "POST", body: form }, 180_000) as Promise<{ id: number; duplicate: boolean; chunks: number; hash: string }>; }
export async function removeKnowledgeDocument(id: number) { return request(`/knowledge/documents/${id}`, { method: "DELETE" }) as Promise<{ removed: boolean }>; }
export async function reindexKnowledge() { return request("/knowledge/reindex", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }) as Promise<{ state: string }>; }
export async function searchKnowledge(documentId: number, query: string, generate = false) { return request("/knowledge/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ document_id: documentId, query, generate }) }, generate ? 180_000 : 30_000) as Promise<{ results: SearchChunk[]; answer?: string | null }>; }
