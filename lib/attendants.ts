export const attendantRoles = ["admin", "vendedor", "tecnico"] as const;
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

export function toLegacyProfileRole(value: unknown) {
  const role=isAttendantRole(value)?value:"vendedor";
  return role === "tecnico" ? "technician" : role === "vendedor" ? "attendant" : "admin";
}

export function permissionOverrides(value: unknown, selected: string[]) {
  const role=isAttendantRole(value)?value:"vendedor";
  // Imported lazily at module level would create no runtime cycle, but keeping the
  // presets here explicit also protects API input from unknown permission names.
  const presets: Record<AttendantRole,string[]> = {
    admin: [],
    vendedor:["dashboard.view","clientes.view","clientes.create","clientes.edit","frente_loja.view","frente_loja.create","vendas.view","vendas.create","vendas.print","produtos.view","categorias.view","estoque.view"],
    tecnico:["dashboard.view","clientes.view","equipamentos.view","equipamentos.create","equipamentos.edit","ordens_servico.view","ordens_servico.create","ordens_servico.edit","orcamentos.view","orcamentos.create","orcamentos.edit","produtos.view","estoque.view","base_conhecimento.view","base_conhecimento_ia.view","atendimentos.view"],
  };
  const preset=new Set(presets[role]); const chosen=new Set(selected);
  return [...new Set([...preset,...chosen])].filter(key=>preset.has(key)!==chosen.has(key)).map(permission_key=>({permission_key,allowed:chosen.has(permission_key)}));
}
