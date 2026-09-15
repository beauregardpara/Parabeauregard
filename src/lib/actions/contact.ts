"use server";

import { db } from "@/lib/db";
import { checkRateLimit, RATE_LIMITS, getServerActionIp } from "@/lib/security/rate-limit";
import { contactSchema } from "@/lib/validation/schemas";

export type ContactResult = { ok: true } | { ok: false; error: string };

export async function submitContact(formData: FormData): Promise<ContactResult> {
  const ip = await getServerActionIp();
  const rl = checkRateLimit(ip, RATE_LIMITS.contact);
  if (!rl.allowed) return { ok: false, error: "Trop de messages envoyés. Réessayez plus tard." };

  const parsed = contactSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    subject: String(formData.get("subject") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
  });

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };

  const { name, email, subject, message } = parsed.data;

  // Horodatage simple (sans dépendance) pour tracer la demande de contact.
  await db.activityLog.create({
    data: {
      action: "CONTACT",
      entity: "contact",
      entityId: email,
      details: JSON.stringify({ name, email, subject, message: message.slice(0, 500), at: new Date().toISOString() }),
    },
  });

  return { ok: true };
}