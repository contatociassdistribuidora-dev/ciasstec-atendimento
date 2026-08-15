export type WhatsAppMessage = { to: string; body: string };

export async function sendWhatsAppMessage(message: WhatsAppMessage) {
  void message;
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) return { simulated: true, messageId: `sim-${Date.now()}` };
  throw new Error("Envio real ainda não habilitado. Configure a API oficial da Meta.");
}
