"use server";

import { db } from "@/lib/db";
import { getCurrentCustomer } from "@/lib/auth";

export type SyncCartItem = { productId: number; qty: number };

/**
 * Persiste le panier du client connecté côté serveur.
 * Remplacement simple (delete+create) : le panier client est la source de
 * vérité pendant la session ; le serveur garantit la continuité multi-appareils.
 */
export async function syncCartForCustomer(items: SyncCartItem[]): Promise<{ ok: boolean }> {
  try {
    const customer = await getCurrentCustomer();
    if (!customer) return { ok: false };

    const cleaned = items
      .filter(
        (i) =>
          Number.isInteger(i.productId) &&
          i.productId > 0 &&
          Number.isInteger(i.qty) &&
          i.qty >= 0 &&
          i.qty <= 99
      )
      .slice(0, 50);

    await db.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { customerId: customer.id } });
      if (cleaned.length > 0) {
        await tx.cartItem.createMany({
          data: cleaned.map((i) => ({ customerId: customer.id, productId: i.productId, quantity: i.qty })),
        });
      }
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}