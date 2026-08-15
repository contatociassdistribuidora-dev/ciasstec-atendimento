import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const verifyToken = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (
    mode === "subscribe" &&
    challenge !== null &&
    expectedToken &&
    verifyToken === expectedToken
  ) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Falha na verificação" }, { status: 403 });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const webhook = payload as {
    object?: string;
    entry?: unknown[];
  };

  if (webhook.object !== "whatsapp_business_account") {
    return NextResponse.json({ received: true, ignored: true });
  }

  // A Meta precisa receber HTTP 200 rapidamente. O processamento e a persistência
  // dos eventos podem ser adicionados aqui ou encaminhados para uma fila.
  console.info("Webhook WhatsApp recebido", {
    entries: Array.isArray(webhook.entry) ? webhook.entry.length : 0,
  });

  return NextResponse.json({ received: true });
}
