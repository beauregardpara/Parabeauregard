"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { returnSchema } from "@/lib/validation/schemas";
import { checkRateLimit, RATE_LIMITS, getServerActionIp } from "@/lib/security/rate-limit";
import { sendTransactionalEmail } from "@/lib/email";

export type CreateReturnResult = { ok: boolean; error?: string };

/**
 * Crée une demande de retour associée à une commande DELIVERED.
 * L'authentification passe par la correspondance référence + email
 * (pas de compte requis), comme le suivi de commande.
 */
export async function createReturnRequest(formData: FormData): Promise<CreateReturnResult> {
  const ip = await getServerActionIp();
  const rl = checkRateLimit(ip, RATE_LIMITS.contact);
  if (!rl.allowed) return { ok: false, error: "Trop de demandes. Réessayez plus tard." };

  const parsed = returnSchema.safeParse({
    reference: String(formData.get("reference") ?? "").trim().toUpperCase(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    reason: String(formData.get("reason") ?? "").trim(),
    details: String(formData.get("details") ?? "").trim(),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };

  const { reference, email, reason, details } = parsed.data;

  const order = await db.order.findUnique({
    where: { reference },
    select: {
      id: true,
      email: true,
      reference: true,
      status: true,
      fullName: true,
    },
  });

  if (!order || order.email.toLowerCase() !== email || order.status !== "DELIVERED") {
    // Anti-énumération : même message dans tous les cas d'échec.
    return {
      ok: false,
      error:
        "Impossible de créer la demande : vérifiez que la référence et l'email correspondent à une commande livrée.",
    };
  }

  const existing = await db.returnRequest.findFirst({ where: { orderId: order.id, status: "PENDING" } });
  if (existing) return { ok: false, error: "Une demande de retour est déjà en cours pour cette commande." };

  try {
    await db.returnRequest.create({
      data: {
        orderId: order.id,
        fullName: order.fullName,
        email,
        reason,
        details: details || null,
        status: "PENDING",
      },
    });

    await sendTransactionalEmail({
      to: email,
      template: "return-requested",
      data: { reference: order.reference },
    });

    return { ok: true };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return { ok: false, error: "Une erreur est survenue. Réessayez." };
    }
    return { ok: false, error: "Une erreur est survenue. Réessayez." };
  }
}

const VALID_DECISIONS = ["APPROVED", "REJECTED"] as const;

export async function decideReturn(formData: FormData) {
  await requireRole("SUPER_ADMIN", "ORDER_MANAGER");
  const id = Number(formData.get("id"));
  const decision = String(formData.get("decision"));
  const note = String(formData.get("adminNote") ?? "").trim();
  if (!VALID_DECISIONS.includes(decision as (typeof VALID_DECISIONS)[number])) return;

  const request = await db.returnRequest.findUnique({
    where: { id },
    include: { order: true },
  });
  if (!request || request.status !== "PENDING") return;

  await db.$transaction([
    db.returnRequest.update({
      where: { id },
      data: { status: decision as never, adminNote: note || null },
    }),
    db.activityLog.create({
      data: {
        action: `Retour : ${decision}`,
        entity: "ReturnRequest",
        entityId: String(id),
        details: `Commande ${request.order.reference}`,
      },
    }),
  ]);

  await sendTransactionalEmail({
    to: request.email,
    template: "return-updated",
    data: {
      reference: request.order.reference,
      decision: decision === "APPROVED" ? "approuvée" : "refusée",
      note: note || "Notre équipe vous contactera rapidement.",
    },
  });

  revalidatePath("/admin/retours");
  revalidatePath(`/admin/commandes/${request.order.id}`);
}