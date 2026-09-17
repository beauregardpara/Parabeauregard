import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { roundMoney } from "@/lib/format";

export type DailySeries = { day: string; revenue: number; orders: number };

/**
 * Clé de journée en heure locale (`AAAA-MM-JJ`).
 * `toISOString()` bascule en UTC : au Maroc (UTC+1), minuit local correspond à
 * 23 h la veille en UTC, ce qui décalait toutes les commandes d'un jour et
 * faisait disparaître celles du jour même du graphique.
 */
function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** CA et nb de commandes par jour sur les N derniers jours (hors annulées). */
async function getRevenueSeriesImpl(days: number): Promise<DailySeries[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const rows = await db.order.findMany({
    where: { status: { not: "CANCELLED" }, createdAt: { gte: since } },
    select: { createdAt: true, total: true },
  });

  const buckets = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.set(dayKey(d), { revenue: 0, orders: 0 });
  }
  for (const r of rows) {
    const key = dayKey(new Date(r.createdAt));
    const b = buckets.get(key);
    if (b) {
      b.revenue += r.total;
      b.orders += 1;
    }
  }

  return [...buckets.entries()].map(([day, v]) => ({
    day,
    revenue: roundMoney(v.revenue),
    orders: v.orders,
  }));
}

export type CategoryStat = { category: string; revenue: number; orders: number };

/** Répartition du CA par catégorie (sur les commandes non annulées). */
async function getRevenueByCategoryImpl(): Promise<CategoryStat[]> {
  const orders = await db.order.findMany({
    where: { status: { not: "CANCELLED" } },
    include: {
      items: { include: { product: { include: { category: true } } } },
    },
  });

  const byCategory = new Map<string, { revenue: number; orders: Set<number> }>();
  for (const o of orders) {
    const itemsTotal = o.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    if (itemsTotal <= 0) continue;
    // Ratio de la commande alloué à chaque ligne (hors livraison, réduction répartie)
    for (const it of o.items) {
      const cat = it.product?.category?.name ?? "Sans catégorie";
      const lineAmount = it.unitPrice * it.quantity;
      const allocated = (lineAmount / itemsTotal) * (o.total - o.shippingCost);
      const entry = byCategory.get(cat) ?? { revenue: 0, orders: new Set<number>() };
      entry.revenue += allocated;
      entry.orders.add(o.id);
      byCategory.set(cat, entry);
    }
  }
  return [...byCategory.entries()]
    .map(([category, v]) => ({ category, revenue: roundMoney(v.revenue), orders: v.orders.size }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** Cache 2 min côté serveur : le tableau de bord ne recharge pas toutes les commandes à chaque clic. */
export const getRevenueSeries = unstable_cache(getRevenueSeriesImpl, ["analytics-revenue-series"], {
  revalidate: 120,
});
export const getRevenueByCategory = unstable_cache(getRevenueByCategoryImpl, ["analytics-revenue-by-category"], {
  revalidate: 120,
});

/** Répartition par méthode de paiement (commandes non annulées). */
export async function getPaymentSplit() {
  const rows = await db.order.groupBy({
    by: ["paymentMethod"],
    where: { status: { not: "CANCELLED" } },
    _count: { _all: true },
    _sum: { total: true },
  });
  return rows.map((r) => ({
    method: r.paymentMethod,
    count: r._count._all,
    revenue: roundMoney(r._sum.total ?? 0),
  }));
}

/** Taux d'annulation global et récent (7 j). */
export async function getCancellationStats() {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const [total, cancelled, recentTotal, recentCancelled] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { status: "CANCELLED" } }),
    db.order.count({ where: { createdAt: { gte: since } } }),
    db.order.count({ where: { status: "CANCELLED", createdAt: { gte: since } } }),
  ]);

  return {
    totalRate: total > 0 ? (cancelled / total) * 100 : 0,
    recentRate: recentTotal > 0 ? (recentCancelled / recentTotal) * 100 : 0,
    cancelled,
    recentCancelled,
  };
}

/** Panier moyen des commandes non annulées. */
export async function getAverageBasket() {
  const agg = await db.order.aggregate({
    _sum: { total: true },
    _count: true,
    where: { status: { not: "CANCELLED" } },
  });
  const count = agg._count;
  return count > 0 ? roundMoney((agg._sum.total ?? 0) / count) : 0;
}
// ── Pilotage quotidien ─────────────────────────────────────────────

const BUSINESS_TIME_ZONE = "Africa/Casablanca";

/** Minuit (heure de Casablanca) du jour de `now`, exprimé comme instant absolu. */
export function startOfBusinessDay(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // Décalage réel de Casablanca à cet instant (gère les changements d'heure).
  const localAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  const offsetMs = localAsUtc - Math.floor(now.getTime() / 1000) * 1000;
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")) - offsetMs);
}

export type OperationsSnapshot = {
  ordersToday: number;
  revenueToday: number;
  revenue7d: number;
  revenue30d: number;
  toProcess: number;
  lowStock: number;
};

/** Indicateurs du jour, calculés uniquement à partir des données réelles. */
export async function getOperationsSnapshot(lowStockThreshold: number, now: Date = new Date()): Promise<OperationsSnapshot> {
  const today = startOfBusinessDay(now);
  const since7 = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  const since30 = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
  const notCancelled = { status: { not: "CANCELLED" as const } };
  const [ordersToday, revenueToday, revenue7d, revenue30d, toProcess, lowStock] = await Promise.all([
    db.order.count({ where: { ...notCancelled, createdAt: { gte: today } } }),
    db.order.aggregate({ _sum: { total: true }, where: { ...notCancelled, createdAt: { gte: today } } }),
    db.order.aggregate({ _sum: { total: true }, where: { ...notCancelled, createdAt: { gte: since7 } } }),
    db.order.aggregate({ _sum: { total: true }, where: { ...notCancelled, createdAt: { gte: since30 } } }),
    db.order.count({ where: { status: { in: ["NEW", "PREPARING"] } } }),
    db.product.count({
      where: { status: "PUBLISHED", unlimitedStock: false, stock: { gt: 0, lte: Math.max(0, lowStockThreshold) } },
    }),
  ]);
  return {
    ordersToday,
    revenueToday: roundMoney(revenueToday._sum.total ?? 0),
    revenue7d: roundMoney(revenue7d._sum.total ?? 0),
    revenue30d: roundMoney(revenue30d._sum.total ?? 0),
    toProcess,
    lowStock,
  };
}
