export const baseRoles = ["admin", "vendedor", "tecnico"] as const;
export type BaseRole = (typeof baseRoles)[number];

export const permissionGroups: readonly {label:string;modules:readonly {key:string;label:string;actions:readonly string[]}[]}[] = [
  { label: "ATENDIMENTO", modules: [
    { key: "dashboard", label: "Dashboard", actions: ["view"] }, { key: "atendimentos", label: "Atendimentos", actions: ["view"] },
    { key: "clientes", label: "Clientes", actions: ["view", "create", "edit", "delete"] },
  ] },
  { label: "ASSISTÊNCIA TÉCNICA", modules: [
    { key: "equipamentos", label: "Equipamentos", actions: ["view", "create", "edit", "delete"] },
    { key: "ordens_servico", label: "Ordens de Serviço", actions: ["view", "create", "edit", "reserve_part", "use_part", "finish", "delete"] },
    { key: "orcamentos", label: "Orçamentos", actions: ["view", "create", "edit", "approve", "print"] },
    { key: "base_conhecimento", label: "Base de Conhecimento", actions: ["view", "create", "edit", "delete"] },
    { key: "base_conhecimento_ia", label: "Base de Conhecimento IA", actions: ["view"] },
  ] },
  { label: "LOJA", modules: [
    { key: "frente_loja", label: "Frente de Loja", actions: ["view", "create"] }, { key: "vendas", label: "Vendas", actions: ["view", "create", "discount", "cancel", "print"] },
    { key: "produtos", label: "Produtos", actions: ["view", "create", "edit", "view_cost", "change_price"] }, { key: "categorias", label: "Categorias", actions: ["view", "create", "edit", "delete"] },
    { key: "estoque", label: "Estoque", actions: ["view", "entry", "adjust_stock", "view_cost"] }, { key: "movimentacoes", label: "Movimentações", actions: ["view"] },
    { key: "fornecedores", label: "Fornecedores", actions: ["view", "create", "edit", "delete"] },
  ] },
  { label: "GESTÃO", modules: [
    { key: "relatorios", label: "Relatórios", actions: ["view", "export"] }, { key: "configuracoes", label: "Configurações", actions: ["view", "manage_integrations"] },
    { key: "usuarios", label: "Usuários", actions: ["view", "create", "edit", "reset_password", "deactivate", "manage_users"] },
  ] },
];

export type PermissionKey = string;
export const allPermissions = permissionGroups.flatMap(group => group.modules.flatMap(module => module.actions.map(action => `${module.key}.${action}`)));
export const rolePresets: Record<BaseRole, string[]> = {
  admin: allPermissions,
  vendedor: ["dashboard.view","clientes.view","clientes.create","clientes.edit","frente_loja.view","frente_loja.create","vendas.view","vendas.create","vendas.print","produtos.view","categorias.view","estoque.view"],
  tecnico: ["dashboard.view","clientes.view","equipamentos.view","equipamentos.create","equipamentos.edit","ordens_servico.view","ordens_servico.create","ordens_servico.edit","orcamentos.view","orcamentos.create","orcamentos.edit","produtos.view","estoque.view","base_conhecimento.view","base_conhecimento_ia.view","atendimentos.view"],
};
export function normalizeBaseRole(role: string | null | undefined): BaseRole { if (role === "admin") return "admin"; if (role === "tecnico" || role === "technician") return "tecnico"; return "vendedor"; }
export function canAccess(role: BaseRole, permissions: readonly string[], permission: string) { return role === "admin" || permissions.includes(permission); }
export const actionLabels: Record<string, string> = { view:"Visualizar",create:"Cadastrar",edit:"Editar",delete:"Excluir",approve:"Aprovar",print:"Imprimir",export:"Exportar",reserve_part:"Reservar peça",use_part:"Utilizar peça",finish:"Finalizar",discount:"Dar desconto",cancel:"Cancelar",view_cost:"Visualizar custo",change_price:"Alterar preço",entry:"Dar entrada",adjust_stock:"Ajustar estoque",manage_integrations:"Gerenciar integrações",reset_password:"Resetar senha",deactivate:"Desativar",manage_users:"Gerenciar usuários" };
