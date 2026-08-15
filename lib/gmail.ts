export type EmailMessage = { to: string; subject: string; html: string };

export async function sendEmail(message: EmailMessage) {
  void message;
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return { simulated: true, messageId: `sim-${Date.now()}` };
  throw new Error("Envio real ainda não habilitado. Configure o OAuth do Google.");
}
