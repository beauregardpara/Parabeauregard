/**
 * Permissions des rôles administrateurs, partagées entre le serveur (contrôle
 * d'accès) et l'interface (menu). Aucune dépendance serveur ici.
 */

export type AdminRole = "SUPER_ADMIN" | "CATALOG_MANAGER" | "ORDER_MANAGER";

/** Permissions par rôle — étendre au besoin. */
const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  SUPER_ADMIN: [
    "products:read", "products:write", "products:delete",
    "categories:read", "categories:write", "categories:delete",
    "orders:read", "orders:write",
    "customers:read",
    "reviews:read", "reviews:write",
    "coupons:read", "coupons:write",
    "users:read", "users:write",
    "scraper:read", "scraper:write",
    "reputation:read", "reputation:write",
    "settings:read", "settings:write",
    "logs:read",
    "chat:read",
  ],
  CATALOG_MANAGER: [
    "products:read", "products:write",
    "categories:read", "categories:write",
    "reviews:read", "reviews:write",
    "coupons:read", "coupons:write",
    "scraper:read", "scraper:write",
    "reputation:read", "reputation:write",
    "settings:read",
  ],
  ORDER_MANAGER: [
    "orders:read", "orders:write",
    "customers:read",
    "products:read",
    "reviews:read",
    "reputation:read",
  ],
};

export function hasPermission(role: AdminRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Permission de lecture requise pour chaque section de l'administration. */
export const ADMIN_SECTION_PERMISSIONS: Record<string, string> = {
  "/admin": "orders:read",
  "/admin/produits": "products:read",
  "/admin/categories": "categories:read",
  "/admin/commandes": "orders:read",
  "/admin/retours": "orders:read",
  "/admin/clients": "customers:read",
  "/admin/avis": "reviews:read",
  "/admin/promotions": "coupons:read",
  "/admin/scraper": "scraper:read",
  "/admin/quality": "products:write",
  "/admin/system": "settings:read",
  "/admin/chat": "chat:read",
  "/admin/reputation": "reputation:read",
  "/admin/utilisateurs": "users:read",
  "/admin/journal": "logs:read",
};

export function canAccessAdminSection(role: string, href: string): boolean {
  const permission = ADMIN_SECTION_PERMISSIONS[href];
  return !permission || hasPermission(role as AdminRole, permission);
}
