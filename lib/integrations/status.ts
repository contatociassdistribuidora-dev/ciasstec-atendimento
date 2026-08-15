const isPresent = (value: string | undefined) => Boolean(value?.trim());

export function getIntegrationStatus() {
  const whatsapp = {
    accessToken: isPresent(process.env.WHATSAPP_ACCESS_TOKEN),
    phoneNumberId: isPresent(process.env.WHATSAPP_PHONE_NUMBER_ID),
    verifyToken: isPresent(process.env.WHATSAPP_VERIFY_TOKEN),
  };
  const gmail = {
    clientId: isPresent(process.env.GOOGLE_CLIENT_ID),
    clientSecret: isPresent(process.env.GOOGLE_CLIENT_SECRET),
  };

  return {
    whatsapp: { configured: Object.values(whatsapp).every(Boolean), ...whatsapp },
    openai: { configured: isPresent(process.env.OPENAI_API_KEY) },
    gmail: { configured: Object.values(gmail).every(Boolean), ...gmail },
  };
}
