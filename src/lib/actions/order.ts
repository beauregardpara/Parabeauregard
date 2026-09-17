"use server";

import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentCustomer } from "@/lib/auth";
import { getSettingNumber, getDeliveryCities, cityShippingFee, SETTING_KEYS, type DeliveryCityFee } from "@/lib/settings";
import { roundMoney } from "@/lib/format";
import { checkoutSchema } from "@/lib/validation/schemas";
import { checkRateLimit, RATE_LIMITS, getServerActionIp } from "@/lib/security/rate-limit";
import { businessNotificationEmail, sendTransactionalEmail } from "@/lib/email";

export type CheckoutInput = {
  fullName: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  postalCode?: string;
  /** Unique mode de paiement supporté aujourd'hui (paiement à la livraison). */
  paymentMethod: "COD";
  notes?: string;
  couponCode?: string;
  items: { productId: number; qty: number }[];
};

export type CheckoutResult =
  | { ok: true; reference: string; confirmationToken: string }
  | { ok: false; error: string };

export type CheckoutSettings = {
  shippingFlat: number;
  freeShippingThreshold: number;
  loyaltyPointsPerDhs: number;
  deliveryCities: DeliveryCityFee[];
};

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  const [shippingFlat, freeShippingThreshold, loyaltyPointsPerDhs, deliveryCities] = await Promise.all([
    getSettingNumber(SETTING_KEYS.shippingFlat),
    getSettingNumber(SETTING_KEYS.freeShippingThreshold),
    getSettingNumber(SETTING_KEYS.loyaltyPointsPerDhs),
    getDeliveryCities(),
  ]);
  return {
    shippingFlat: shippingFlat || 0,
    freeShippingThreshold: freeShippingThreshold || 0,
    loyaltyPointsPerDhs: loyaltyPointsPerDhs || 0,
    deliveryCities,
  };
}

function generateRef(): string {
  // 6 octets aléatoires → 48 bits, encodés en base36 (≈ 10 caractères).
  const random = randomBytes(6).readUIntBE(0, 6).toString(36).toUpperCase().padStart(10, "0");
  return `PB-${new Date().getFullYear()}-${random}`;
}

/**
 * Référence de commande garantie unique.
 * `Order.reference` est `@unique` : sans ce contrôle, une collision (même
 * improbable) remonterait au client comme une erreur base de données opaque.
 */
async function generateUniqueRef(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateRef();
    const clash = await db.order.findUnique({ where: { reference: candidate }, select: { id: true } });
    if (!clash) return candidate;
  }
  throw new Error("REFERENCE_COLLISION");
}

function generateToken(): string {
  return randomBytes(24).toString("hex");
}

export async function validateCoupon(code: string, subtotal: number) {
  const coupon = await db.coupon.findUnique({ where: { code: code.toUpperCase().trim() } });
  if (!coupon || !coupon.active) return { ok: false as const, error: "Code promo invalide." };
  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) return { ok: false as const, error: "Ce code n'est pas encore actif." };
  if (coupon.endsAt && now > coupon.endsAt) return { ok: false as const, error: "Ce code a expiré." };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit)
    return { ok: false as const, error: "Ce code a atteint sa limite d'utilisation." };
  if (subtotal < coupon.minOrder)
    return { ok: false as const, error: `Commande minimum de ${coupon.minOrder} DH pour ce code.` };
  const discount =
    coupon.type === "PERCENT" ? roundMoney(subtotal * (coupon.value / 100)) : coupon.value;
  return { ok: true as const, discount, code: coupon.code };
}

export async function createOrder(input: CheckoutInput): Promise<CheckoutResult> {
  try {
    // Rate limiting par IP
    const ip = await getServerActionIp();
    const rl = checkRateLimit(ip, RATE_LIMITS.checkout);
    if (!rl.allowed) return { ok: false, error: "Trop de commandes. Réessayez plus tard." };

    // Zod validation
    const parsed = checkoutSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };

    const data = parsed.data;
    if (!data.items.length) return { ok: false, error: "Votre panier est vide." };

    // Revalider les produits côté serveur : prix réels, disponibilité, stock
    const ids = data.items.map((i) => i.productId);
    const products = await db.product.findMany({
      where: { id: { in: ids }, status: "PUBLISHED" },
      include: { images: { orderBy: { order: "asc" }, take: 1 } },
    });
    const lines: {
      productId: number;
      productName: string;
      productSlug: string;
      imageUrl: string | null;
      unitPrice: number;
      quantity: number;
    }[] = [];
    let subtotal = 0;

    for (const item of data.items) {
      const p = products.find((x) => x.id === item.productId);
      // Produit retiré du catalogue ou dépublié entre l'ajout au panier et la
      // validation : on refuse la commande plutôt que de la livrer amputée.
      if (!p)
        return {
          ok: false,
          error: "Un article de votre panier n'est plus disponible à la vente. Rafraîchissez votre panier pour continuer.",
        };
      if (!p.unlimitedStock && p.stock <= 0)
        return { ok: false, error: `« ${p.name} » vient de devenir indisponible. Retirez-le du panier pour continuer.` };
      if (!p.unlimitedStock && p.stock < item.qty)
        return { ok: false, error: `« ${p.name} » n'est plus disponible en quantité ${item.qty} (stock restant : ${p.stock}). Ajustez votre panier.` };
      const qty = item.qty;
      const unitPrice = p.promoPrice && p.promoPrice < p.price ? p.promoPrice : p.price;
      subtotal = roundMoney(subtotal + unitPrice * qty);

      lines.push({
        productId: p.id,
        productName: p.name,
        productSlug: p.slug,
        imageUrl: p.images[0]?.url ?? null,
        unitPrice,
        quantity: qty,
      });
    }

    if (!lines.length) return { ok: false, error: "Aucun produit valide dans le panier." };

    let discount = 0;
    let couponCode: string | null = null;
    let couponId: number | null = null;
    if (data.couponCode?.trim()) {
      const res = await validateCoupon(data.couponCode, subtotal);
      if (res.ok) {
        discount = res.discount;
        couponCode = res.code;
        // Get coupon ID for atomic check
        const coupon = await db.coupon.findUnique({ where: { code: couponCode }, select: { id: true } });
        couponId = coupon?.id ?? null;
      }
    }

    const flat = await getSettingNumber(SETTING_KEYS.shippingFlat);
    const threshold = await getSettingNumber(SETTING_KEYS.freeShippingThreshold);
    const cities = await getDeliveryCities();
    // Frais par ville si la ville est reconnue, sinon frais standard
    const shippingCost =
      subtotal >= threshold ? 0 : cityShippingFee(cities, data.city) ?? flat;
    // Discount ne peut jamais dépasser le sous-total
    const boundedDiscount = Math.min(discount, subtotal);
    const total = roundMoney(subtotal - boundedDiscount + shippingCost);

    const customer = await getCurrentCustomer();
    const reference = await generateUniqueRef();

    // Points de fidélité gagnés (1 DH = 1 point par défaut)
    const pointsPerDhs = await getSettingNumber(SETTING_KEYS.loyaltyPointsPerDhs) || 0;
    const pointsEarned = pointsPerDhs > 0 ? Math.floor(total * pointsPerDhs) : 0;

    // Transaction atomique : commande + decrement stock + increment coupon
    const order = await db.$transaction(async (tx) => {
      // Atomic coupon use-limit check (dans la transaction, sérialisée par la base)
      if (couponId && couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { id: couponId },
          select: { usageLimit: true, usedCount: true },
        });
        if (!coupon || (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit)) {
          throw new Error("COUPON_LIMIT_REACHED");
        }
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      const createdOrder = await tx.order.create({
        data: {
          reference,
          confirmationToken: generateToken(),
          customerId: customer?.id ?? null,
          paymentMethod: data.paymentMethod,
          paid: false,
          fullName: data.fullName.trim(),
          email: data.email?.trim() ?? customer?.email ?? "",
          phone: data.phone.trim(),
          addressStreet: data.street.trim(),
          addressCity: data.city.trim(),
          addressPostal: data.postalCode?.trim() || null,
          subtotal: roundMoney(subtotal),
          shippingCost,
          discount: boundedDiscount,
          total,
          couponCode,
          pointsEarned,
          notes: data.notes?.trim() || null,
          items: { create: lines },
          statusHistory: { create: { to: "NEW", note: "Commande enregistrée" } },
        },
      });

      // Créditer les points de fidélité du client connecté + journaliser
      if (customer && pointsEarned > 0) {
        await tx.customer.update({
          where: { id: customer.id },
          data: { loyaltyPoints: { increment: pointsEarned } },
        });
        await tx.loyaltyTransaction.create({
          data: {
            customerId: customer.id,
            type: "EARNED",
            amount: pointsEarned,
            label: `Commande ${reference}`,
            orderId: createdOrder.id,
          },
        });
      }

      // Décrémenter le stock de façon atomique et comptabiliser les ventes
      for (const line of lines) {
        const currentStock = await tx.product.findUnique({
          where: { id: line.productId },
          select: { stock: true, unlimitedStock: true },
        });
        if (!currentStock) continue;

        if (currentStock.unlimitedStock) {
          // Produit en quantité non garantie : on ne touche pas au stock réel
          const dec = await tx.product.updateMany({
            where: { id: line.productId, unlimitedStock: true },
            data: { soldCount: { increment: line.quantity } },
          });
          if (dec.count === 0) throw new Error("STOCK_INSUFFICIENT");
        } else {
          const dec = await tx.product.updateMany({
            where: { id: line.productId, stock: { gte: line.quantity } },
            data: {
              stock: { decrement: line.quantity },
              soldCount: { increment: line.quantity },
            },
          });
          if (dec.count === 0) throw new Error("STOCK_INSUFFICIENT");
          const after = await tx.product.findUnique({
            where: { id: line.productId },
            select: { stock: true },
          });
          await tx.stockHistory.create({
            data: {
              productId: line.productId,
              oldStock: (after?.stock ?? 0) + line.quantity,
              newStock: after?.stock ?? 0,
              reason: "commande",
            },
          });
        }
      }

      return createdOrder;
    });

    await sendTransactionalEmail({
      to: order.email,
      template: "order-confirmation",
      data: {
        fullName: order.fullName,
        reference: order.reference,
        token: order.confirmationToken ?? "",
        total: order.total.toFixed(2),
      },
    });

    // Notification interne : la parapharmacie est prévenue de chaque commande
    // (jamais bloquant, le résultat est journalisé dans EmailLog).
    await sendTransactionalEmail({
      to: businessNotificationEmail(),
      template: "new-order-admin",
      replyTo: order.email || undefined,
      data: {
        orderId: order.id,
        reference: order.reference,
        fullName: order.fullName,
        phone: order.phone,
        email: order.email,
        address: order.addressStreet,
        city: order.addressCity,
        itemsText: lines.map((l) => `${l.productName} × ${l.quantity} — ${roundMoney(l.unitPrice * l.quantity).toFixed(2)} DH`).join("\n"),
        subtotal: order.subtotal.toFixed(2),
        shipping: order.shippingCost.toFixed(2),
        discount: order.discount.toFixed(2),
        total: order.total.toFixed(2),
        notes: order.notes,
      },
    });

    return { ok: true, reference: order.reference, confirmationToken: order.confirmationToken ?? "" };
  } catch (err) {
    if (err instanceof Error && err.message === "REFERENCE_COLLISION") {
      return { ok: false, error: "Impossible de générer une référence de commande. Réessayez." };
    }
    if (err instanceof Error && err.message === "COUPON_LIMIT_REACHED") {
      return { ok: false, error: "Ce code a atteint sa limite d'utilisation." };
    }
    if (err instanceof Error && err.message === "STOCK_INSUFFICIENT") {
      return { ok: false, error: "Un article est devenu indisponible. Veuillez rafraîchir votre panier et réessayer." };
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return { ok: false, error: "Erreur base de données, veuillez réessayer." };
    }
    return { ok: false, error: "Une erreur est survenue lors de la commande. Réessayez." };
  }
}
