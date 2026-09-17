import type { EmailData, EmailTemplate } from "./index";
import { SITE_URL } from "@/config/site";

/**
 * Rendus HTML minimaux (inline, sans dépendance) pour les emails
 * transactionnels. Les données viennent toujours du domaine réel,
 * jamais inventées.
 */

const BASE_LINK = SITE_URL;

/** Échappe tout texte interpolé dans le HTML (anti-XSS emails). */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="fr">
<body style="margin:0;background:#f3f6f4;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:24px;">
    <tr><td style="background:#f3f6f4;">
      <p style="font-size:22px;font-weight:bold;color:#0f766e;margin:0 0 16px;">Para Beauregard</p>
      <div style="background:#ffffff;border-radius:16px;padding:24px;border:1px solid #dcefe9;">
        <h1 style="font-size:18px;color:#0b2e26;margin:0 0 12px;">${esc(title)}</h1>
        ${body}
      </div>
      <p style="font-size:11px;color:#94a3b8;margin-top:16px;">Cet email vous est envoyé automatiquement par Para Beauregard. Merci de ne pas y répondre.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Paragraphe HTML : reçoit du markup déjà construit dont TOUTES les valeurs
 * dynamiques ont été passées par esc(). Les statiques sont sûres par nature.
 */
function p(value: string): string {
  return `<p style="margin:6px 0;font-size:14px;color:#334155;line-height:1.5;">${value}</p>`;
}

function link(url: string, label: string): string {
  return `<a href="${esc(url)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:bold;font-size:14px;margin:12px 0;">${esc(label)}</a>`;
}

function trackingUrl(reference: string, token: string): string {
  return `${BASE_LINK}/suivi-commande/${encodeURIComponent(reference)}?token=${encodeURIComponent(token)}`;
}

export function renderEmail(template: EmailTemplate, data: EmailData): { subject: string; html: string } {
  switch (template) {
    case "order-confirmation": {
      const ref = String(data.reference ?? "");
      const token = String(data.token ?? "");
      const total = String(data.total ?? "");
      const body = [
        p(`Bonjour ${esc(String(data.fullName ?? ""))}, merci pour votre commande <strong>${esc(ref)}</strong>.`),
        p(`Montant à régler à la livraison : <strong>${esc(total)} DH</strong>.`),
        link(trackingUrl(ref, token), "Suivre ma commande"),
      ].join("");
      return { subject: `Confirmation commande ${ref}`, html: layout("Commande confirmée", body) };
    }
    case "order-status": {
      const ref = String(data.reference ?? "");
      const statusLabel = String(data.statusLabel ?? data.status ?? "");
      const note = data.note ? String(data.note) : null;
      const body = [
        p(`Le statut de votre commande <strong>${esc(ref)}</strong> est désormais : <strong>${esc(statusLabel)}</strong>.`),
        ...(note ? [p(`Note : ${esc(note)}`)] : []),
        link(`${BASE_LINK}/suivi-commande`, "Suivre mes commandes"),
      ].join("");
      return { subject: `Commande ${ref} — ${statusLabel}`, html: layout("Mise à jour de commande", body) };
    }
    case "return-requested": {
      const ref = String(data.reference ?? "");
      const body = [
        p(`Votre demande de retour pour la commande <strong>${esc(ref)}</strong> a bien été enregistrée.`),
        p("Notre équipe la traitera sous 48 h ouvrées et vous répondra par email."),
      ].join("");
      return { subject: `Demande de retour ${ref}`, html: layout("Demande de retour reçue", body) };
    }
    case "return-updated": {
      const ref = String(data.reference ?? "");
      const decision = String(data.decision ?? "");
      const note = data.note ? String(data.note) : "";
      const body = [
        p(`Votre demande de retour pour la commande <strong>${esc(ref)}</strong> a été <strong>${esc(decision)}</strong>.`),
        ...(note ? [p(`Message de notre équipe : ${esc(note)}`)] : []),
      ].join("");
      return { subject: `Retour ${ref} — ${decision}`, html: layout("Réponse concernant votre retour", body) };
    }
    case "new-order-admin": {
      const ref = String(data.reference ?? "");
      const lines = String(data.itemsText ?? "")
        .split("\n")
        .filter(Boolean)
        .map((line) => `<li>${esc(line)}</li>`)
        .join("");
      const body = [
        p(`Nouvelle commande <strong>${esc(ref)}</strong> — paiement à la livraison.`),
        p(`<strong>Client :</strong> ${esc(String(data.fullName ?? ""))} · ${esc(String(data.phone ?? ""))}${data.email ? ` · ${esc(String(data.email))}` : ""}`),
        p(`<strong>Adresse :</strong> ${esc(String(data.address ?? ""))}, ${esc(String(data.city ?? ""))}`),
        `<ul style="margin:8px 0;padding-left:18px;font-size:14px;color:#334155;">${lines}</ul>`,
        p(`Sous-total : ${esc(String(data.subtotal ?? ""))} DH · Livraison : ${esc(String(data.shipping ?? ""))} DH${Number(data.discount ?? 0) > 0 ? ` · Remise : -${esc(String(data.discount))} DH` : ""}`),
        p(`<strong>Total à encaisser : ${esc(String(data.total ?? ""))} DH</strong>`),
        ...(data.notes ? [p(`Note du client : ${esc(String(data.notes))}`)] : []),
        link(`${BASE_LINK}/admin/commandes/${encodeURIComponent(String(data.orderId ?? ""))}`, "Ouvrir la commande"),
      ].join("");
      return { subject: `Nouvelle commande ${ref} — ${String(data.total ?? "")} DH`, html: layout("Nouvelle commande", body) };
    }
    case "contact-admin": {
      const subject = String(data.subject ?? "Demande de contact");
      const body = [
        p(`<strong>De :</strong> ${esc(String(data.name ?? ""))} · ${esc(String(data.email ?? ""))}${data.phone ? ` · ${esc(String(data.phone))}` : ""}`),
        p(`<strong>Sujet :</strong> ${esc(subject)}`),
        p(esc(String(data.message ?? "")).replace(/\n/g, "<br />")),
        p("Répondez directement à cet email pour écrire au client."),
      ].join("");
      return { subject: `Contact site — ${subject}`, html: layout("Nouveau message de contact", body) };
    }
    case "password-reset": {
      const url = `${BASE_LINK}/mot-de-passe/reinitialiser?token=${encodeURIComponent(String(data.token ?? ""))}`;
      const body = [
        p(`Bonjour ${esc(String(data.firstName ?? ""))},`),
        p("Vous avez demandé à réinitialiser le mot de passe de votre compte Para Beauregard. Ce lien est valable 1 heure."),
        link(url, "Choisir un nouveau mot de passe"),
        p("Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email : votre mot de passe reste inchangé."),
      ].join("");
      return { subject: "Réinitialisation de votre mot de passe", html: layout("Mot de passe oublié", body) };
    }
    case "stock-alert": {
      const name = String(data.productName ?? "");
      const slug = String(data.slug ?? "");
      const url = `${BASE_LINK}/produits/${encodeURIComponent(slug)}`;
      const body = [
        p(`Le produit <strong>${esc(name)}</strong> est de nouveau disponible à la vente.`),
        link(url, "Voir le produit"),
      ].join("");
      return { subject: "Produit de nouveau en stock", html: layout("Bonjour", body) };
    }
  }
}
