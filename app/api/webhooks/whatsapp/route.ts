import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode"); const token = url.searchParams.get("hub.verify_token"); const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) return new Response(challenge, { status: 200 });
  return NextResponse.json({ error: "Falha na verificação" }, { status: 403 });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  // Futuro: validar assinatura X-Hub-Signature-256, normalizar e persistir mensagens no Supabase.
  console.info("Webhook WhatsApp simulado recebido", { hasPayload: Boolean(payload) });
  return NextResponse.json({ received: true, simulated: true });
}
