export const attendantRoles = ["admin", "attendant", "technician"] as const;
export type AttendantRole = typeof attendantRoles[number];

export function isAttendantRole(value: unknown): value is AttendantRole {
  return typeof value === "string" && attendantRoles.includes(value as AttendantRole);
}

export function normalizeAttendantInput(body: Record<string, unknown>) {
  return {
    fullName: String(body.fullName ?? "").trim(),
    email: String(body.email ?? "").trim().toLowerCase(),
    phone: String(body.phone ?? "").trim(),
    whatsapp: String(body.whatsapp ?? "").replace(/\D/g, ""),
    role: body.role,
    active: body.active !== false,
    whatsappEnabled: body.whatsappEnabled === true,
  };
}

export function validateAttendant(input: ReturnType<typeof normalizeAttendantInput>) {
  if (input.fullName.length < 2) return "Informe o nome completo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return "Informe um e-mail válido.";
  if (!isAttendantRole(input.role)) return "Função inválida.";
  if (input.whatsappEnabled && input.whatsapp !== "5581983857466") return "O canal WhatsApp CIASSTEC deve usar o número 5581983857466.";
  return null;
}
