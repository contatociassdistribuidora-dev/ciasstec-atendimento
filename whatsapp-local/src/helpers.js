export function normalizePhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) throw new Error("Telefone invalido.");
  return digits;
}

export function anonymousId(value) {
  const text = String(value ?? "");
  return text.length < 8 ? "indisponivel" : `${text.slice(0, 4)}...${text.slice(-4)}`;
}

export function isIgnoredMessage(message) {
  return Boolean(message?.fromMe || message?.isStatus || String(message?.from ?? "").endsWith("@broadcast"));
}

export function messageFilters(message) {
  const from = String(message?.from ?? "");
  return {
    fromMe: Boolean(message?.fromMe),
    status: Boolean(message?.isStatus || from === "status@broadcast" || from.endsWith("@broadcast")),
    group: from.endsWith("@g.us"),
    type: !String(message?.body ?? "").trim(),
    id: !(message?.id?._serialized || message?.id?.id),
  };
}
