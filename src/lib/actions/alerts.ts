"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { productAlertSchema } from "@/lib/validation/schemas";
import { checkRateLimit, RATE_LIMITS, getServerActionIp } from "@/lib/security/rate-limit";

export type CreateStockAlertResult = { ok: boolean; error?: string };

/**
 * Enregistre une alerte « retour en stock » pour une adresse email.
 * Ne crée rien si le produit est actuellement disponible, et se contente
 * de retourner ok si l'alerte existe déjà (upsert sur le couple email+produit).
 */
export async function createStockAlert(formData: FormData): Promise<CreateStockAlertResult> {
  const ip = await getServerActionIp();
  const rl = checkRateLimit(ip, RATE_LIMITS.contact);
  if (!rl.allowed) return { ok: false, error: "Trop de demandes. Réessayez plus tard." };

  const parsed = productAlertSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    productId: Number(formData.get("productId")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };

  const { email, productId } = parsed.data;

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true, stock: true, unlimitedStock: true },
  });
  if (!product || product.status !== "PUBLISHED") {
    return { ok: false, error: "Produit introuvable." };
  }

  if (product.unlimitedStock || product.stock > 0) {
    return { ok: true };
  }

  try {
    await db.productAlert.upsert({
      where: { email_productId: { email, productId } },
      update: {},
      create: { email, productId },
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return { ok: false, error: "Une erreur est survenue. Réessayez." };
    }
    return { ok: false, error: "Une erreur est survenue. Réessayez." };
  }
}