import { db } from "@/lib/db";
import { renderEmail } from "./templates";

/**
 * Abstraction d'envoi d'emails.
 * Sans Resend / SMTP / Mailgun / SendGrid configurés, l'envoi est un no-op SILENCIEUX
 * mais journalisé (status SKIPPED) : l'e-commerce ne doit jamais casser
 * à cause d'un email.
 */

type Provider = { kind: "none" } | { kind: "resend"; from: string; apiKey: string } | { kind: "smtp"; from: string; host: string; port: number; user?: string; pass?: string } | { kind: "mailgun"; from: string; apiKey: string; domain: string } | { kind: "sendgrid"; from: string; apiKey: string };

const FROM_FALLBACK = process.env.MAIL_FROM ?? process.env.EMAIL_FROM ?? "Para Beauregard <no-reply@para-beauregard.ma>";

function resolveProvider(): Provider {
  if (process.env.EMAIL_FROM === "disabled") return { kind: "none" };
  const resendFrom = process.env.RESEND_FROM ?? process.env.MAIL_FROM ?? process.env.EMAIL_FROM;
  if (process.env.RESEND_API_KEY && resendFrom) {
    return { kind: "resend", from: resendFrom, apiKey: process.env.RESEND_API_KEY };
  }
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return {
      kind: "smtp",
      from: process.env.SMTP_FROM ?? process.env.MAIL_FROM ?? process.env.EMAIL_FROM ?? FROM_FALLBACK,
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      user: process.env.SMTP_USER ?? undefined,
      pass: process.env.SMTP_PASSWORD ?? undefined,
    };
  }
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    return {
      kind: "mailgun",
      from: process.env.MAILGUN_FROM ?? process.env.MAIL_FROM ?? process.env.EMAIL_FROM ?? FROM_FALLBACK,
      apiKey: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN,
    };
  }
  if (process.env.SENDGRID_API_KEY) {
    return {
      kind: "sendgrid",
      from: process.env.SENDGRID_FROM ?? process.env.MAIL_FROM ?? process.env.EMAIL_FROM ?? FROM_FALLBACK,
      apiKey: process.env.SENDGRID_API_KEY,
    };
  }
  return { kind: "none" };
}

async function deliver(provider: Provider, to: string, subject: string, html: string): Promise<void> {
  if (provider.kind === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: provider.from, to: [to], subject, html }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}`);
    return;
  }
  if (provider.kind === "smtp") {
    // SMTP natif Node sans librairie externe (fetch SMTP n'existe pas) —
    // on rejette ici volontairement en faveur d'un fournisseur HTTP.
    throw new Error("SMTP non supporté côté serveur sans dépendance. Configurez Mailgun ou SendGrid.");
  }
  if (provider.kind === "mailgun") {
    const body = new URLSearchParams({
      from: provider.from,
      to,
      subject,
      html,
    });
    const res = await fetch(`https://api.mailgun.net/v3/${encodeURIComponent(provider.domain)}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${provider.apiKey}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Mailgun ${res.status}: ${text.slice(0, 200)}`);
    }
    return;
  }
  if (provider.kind === "sendgrid") {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: provider.from },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`SendGrid ${res.status}: ${text.slice(0, 200)}`);
    }
    return;
  }
  // kind: "none" — no-op volontaire
}

export type EmailTemplate =
  | "order-confirmation"
  | "order-status"
  | "return-requested"
  | "return-updated"
  | "stock-alert";

export type EmailData = Record<string, string | number | boolean | null | undefined>;

export async function sendTransactionalEmail(params: {
  to: string;
  template: EmailTemplate;
  data: EmailData;
}): Promise<"sent" | "skipped" | "failed"> {
  const { to, template, data } = params;
  if (!to || !to.includes("@")) return "skipped";

  const provider = resolveProvider();
  if (provider.kind === "none") {
    await db.emailLog
      .create({ data: { to, subject: subjectFor(template), template, status: "SKIPPED" } })
      .catch(() => undefined);
    return "skipped";
  }

  const { subject, html } = renderEmail(template, data);
  try {
    await deliver(provider, to, subject, html);
    await db.emailLog.create({ data: { to, subject, template, status: "SENT" } }).catch(() => undefined);
    return "sent";
  } catch (err) {
    // Jamais fatal : journaliser et continuer.
    await db.emailLog
      .create({
        data: {
          to,
          subject,
          template,
          status: "FAILED",
          error: err instanceof Error ? err.message.slice(0, 500) : "inconnu",
        },
      })
      .catch(() => undefined);
    return "failed";
  }
}

function subjectFor(template: EmailTemplate): string {
  switch (template) {
    case "order-confirmation":
      return "Confirmation de commande";
    case "order-status":
      return "Votre commande a changé de statut";
    case "return-requested":
      return "Demande de retour reçue";
    case "return-updated":
      return "Réponse à votre demande de retour";
    case "stock-alert":
      return "Produit de nouveau disponible";
  }
}

/** expose l'état de config (sanitized) pour la page /admin/system */
export function emailProviderStatus(): { configured: boolean; kind: string } {
  const p = resolveProvider();
  return { configured: p.kind !== "none", kind: p.kind };
}
