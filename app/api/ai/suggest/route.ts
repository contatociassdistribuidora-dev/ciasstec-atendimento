import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body.customerName === "string" ? body.customerName.split(" ")[0] : "cliente";
  return NextResponse.json({ suggestion: `Olá, ${name}! Obrigado pelas informações. Para conseguirmos orientar você com segurança, podemos fazer algumas perguntas rápidas e, se necessário, agendar uma avaliação técnica do equipamento?` });
}
