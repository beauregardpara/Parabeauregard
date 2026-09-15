import { db } from "@/lib/db";

export const SETTING_KEYS = {
  scrapeFrequencyHours: "scrape_frequency_hours",
  autoPublish: "auto_publish",
  activeSources: "active_sources",
  shippingFlat: "shipping_flat",
  freeShippingThreshold: "free_shipping_threshold",
  deliveryCities: "delivery_cities",
  lowStockAlerts: "low_stock_alerts",
  loyaltyPointsPerDhs: "loyalty_points_per_dhs",
} as const;

const DEFAULTS: Record<string, string> = {
  [SETTING_KEYS.scrapeFrequencyHours]: "6",
  [SETTING_KEYS.autoPublish]: "false",
  [SETTING_KEYS.activeSources]: JSON.stringify(["mapara.ma", "phbeauty.ma", "universparadiscount.ma"]),
  [SETTING_KEYS.shippingFlat]: "29",
  [SETTING_KEYS.freeShippingThreshold]: "500",
  [SETTING_KEYS.deliveryCities]: "[]",
  [SETTING_KEYS.lowStockAlerts]: "3",
  [SETTING_KEYS.loyaltyPointsPerDhs]: "1",
};

export async function getSetting(key: string): Promise<string> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key] ?? "";
}

export async function getSettingBool(key: string): Promise<boolean> {
  return (await getSetting(key)) === "true";
}

export async function getSettingNumber(key: string): Promise<number> {
  const n = parseFloat(await getSetting(key));
  return Number.isFinite(n) ? n : 0;
}

export async function setSetting(key: string, value: string) {
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

export async function getActiveSources(): Promise<string[]> {
  try {
    const parsed = JSON.parse(await getSetting(SETTING_KEYS.activeSources));
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return ["mapara.ma", "phbeauty.ma", "universparadiscount.ma"];
}

/** Frais de livraison spécifiques par ville : [{ city, fee }]. */
export type DeliveryCityFee = { city: string; fee: number };

export async function getDeliveryCities(): Promise<DeliveryCityFee[]> {
  try {
    const parsed = JSON.parse(await getSetting(SETTING_KEYS.deliveryCities));
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x): x is DeliveryCityFee => Boolean(x) && typeof x.city === "string" && typeof x.fee === "number")
        .map((x) => ({ city: x.city.trim(), fee: x.fee }));
    }
  } catch {}
  return [];
}

/** Recherche le tarif de livraison d'une ville (comparaison normalisée insensible à la casse/accents). */
export function cityShippingFee(
  cities: DeliveryCityFee[],
  city: string | null | undefined
): number | null {
  if (!city?.trim()) return null;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const target = norm(city);
  if (!target) return null;
  for (const c of cities) {
    if (norm(c.city) === target) return c.fee;
  }
  return null;
}
