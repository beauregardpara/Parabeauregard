/** Libellés de statut de commande partagés entre admin, pages de suivi et emails. */

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: "Reçue — en attente de préparation",
  PREPARING: "En cours de préparation",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
};

export function statusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export const VALID_ORDER_STATES = ["NEW", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;