"use server";

import { db } from "@/lib/db";
import { checkRateLimit, RATE_LIMITS, getServerActionIp } from "@/lib/security/rate-limit";
import { contactSchema } from "@/lib/validation/schemas";
import { businessNotificationEmail, sendTransactionalEmail } from "@/lib/email";

export type ContactResult = { ok: true } | { ok: false; error: string };

const DEFAULT_SUBJECT = "Demande de contact";

export async function submitContact(formData: FormData): Promise<ContactResult> {
  const ip = await getServerActionIp();
  const rl = checkRateLimit(ip, RATE_LIMITS.contact);
  if (!rl.allowed) return { ok: false, error: "Trop de messages envoyés. Réessayez plus tard." };

  // Champ piège invisible : un robot le remplit, un humain jamais. On répond
  // « envoyé » sans rien enregistrer pour ne pas l'aider à s'adapter.
  if (String(formData.get("website") ?? "").trim()) return { ok: true };

  const parsed = contactSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: String(formData.get("phone") ?? "").trim(),
    // Le sujet est facultatif dans le formulaire.
    subject: String(formData.get("subject") ?? "").trim() || DEFAULT_SUBJECT,
    message: String(formData.get("message") ?? "").trim(),
  });

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };

  const { name, email, phone, subject, message } = parsed.data;

  // Trace consultable dans l'administration (Journal d'activité + tableau de bord).
  await db.activityLog.create({
    data: {
      action: "CONTACT",
      entity: "contact",
      entityId: email,
      details: JSON.stringify({ name, email, phone: phone || undefined, subject, message: message.slice(0, 2000), at: new Date().toISOString() }),
    },
  });

  // Notification à la parapharmacie, avec le client en adresse de réponse.
  await sendTransactionalEmail({
    to: businessNotificationEmail(),
    template: "contact-admin",
    replyTo: email,
    data: { name, email, phone: phone || null, subject, message },
  });

  return { ok: true };
}
