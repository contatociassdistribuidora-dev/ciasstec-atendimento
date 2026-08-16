import { requirePermission } from "@/lib/auth/permissions";

/** Compatibilidade para rotas administrativas existentes. */
export async function requireAdmin() {
  return requirePermission("usuarios.manage_users");
}
