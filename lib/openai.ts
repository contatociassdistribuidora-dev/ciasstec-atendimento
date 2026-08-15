export type AiSuggestionInput = { customerName: string; latestMessage: string; context?: string };

export async function generateAiSuggestion(input: AiSuggestionInput) {
  // Interface preparada: substituir pela chamada oficial à OpenAI quando OPENAI_API_KEY estiver configurada.
  const response = await fetch("/api/ai/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error("Não foi possível gerar a sugestão");
  return response.json() as Promise<{ suggestion: string }>;
}
