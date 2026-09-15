const STYLES: Record<string, string> = {
  SUCCESS: "bg-emerald-50 text-emerald-700",
  PARTIAL: "bg-amber-50 text-amber-700",
  FAILED: "bg-red-50 text-red-600",
  RUNNING: "bg-blue-50 text-blue-700",
  NEW: "bg-blue-50 text-blue-700",
  PREPARING: "bg-amber-50 text-amber-700",
  SHIPPED: "bg-indigo-50 text-indigo-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-600",
  PENDING_REVIEW: "bg-amber-50 text-amber-700",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  HIDDEN: "bg-slate-100 text-slate-500",
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-600",
};

const LABELS: Record<string, string> = {
  PENDING_REVIEW: "À valider",
  PREPARING: "En préparation",
  DELIVERED: "Livrée",
  SHIPPED: "Expédiée",
  CANCELLED: "Annulée",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${STYLES[status] ?? "bg-slate-100 text-slate-600"}`}>
      {label ?? LABELS[status] ?? status}
    </span>
  );
}
