"use server";

import { db } from "@/lib/db";
import { getCurrentCustomer } from "@/lib/auth";

/**
 * Synchronise un favori du client connecté côté serveur.
 * active = true → ajoute (upsert), false → retire.
 */
export async function syncFavoriteForCustomer(
  productId: number,
  active: boolean
): Promise<{ ok: boolean }> {
  try {
    const customer = await getCurrentCustomer();
    if (!customer) return { ok: false };

    if (active) {
      await db.favorite.upsert({
        where: { customerId_productId: { customerId: customer.id, productId } },
        create: { customerId: customer.id, productId },
        update: {},
      });
    } else {
      await db.favorite.deleteMany({ where: { customerId: customer.id, productId } });
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}