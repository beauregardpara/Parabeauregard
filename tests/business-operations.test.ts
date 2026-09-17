import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  activityLog: { create: vi.fn() },
  emailLog: { create: vi.fn() },
  setting: { findUnique: vi.fn() },
}));
const emailMock = vi.hoisted(() => ({ sendTransactionalEmail: vi.fn() }));

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/email")>();
  return { ...actual, sendTransactionalEmail: emailMock.sendTransactionalEmail };
});
vi.mock("@/lib/security/rate-limit", () => ({
  RATE_LIMITS: { contact: { maxRequests: 5, windowSeconds: 60, keyPrefix: "contact" } },
  checkRateLimit: () => ({ allowed: true, remaining: 5, resetAt: Date.now() + 60_000 }),
  getServerActionIp: async () => "127.0.0.1",
}));

import { buildSupportReply, detectSupportIntent } from "../src/lib/chat/support";
import { startOfBusinessDay } from "../src/lib/analytics";
import { canAccessAdminSection, hasPermission } from "../src/lib/admin-permissions";
import { renderEmail } from "../src/lib/email/templates";
import { businessNotificationEmail } from "../src/lib/email";
import { submitContact } from "../src/lib/actions/contact";
import { BUSINESS } from "../src/config/business";

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.BUSINESS_NOTIFICATION_EMAIL;
  dbMock.activityLog.create.mockResolvedValue({});
  emailMock.sendTransactionalEmail.mockResolvedValue("sent");
});

describe("assistant — questions pratiques", () => {
  it.each([
    ["Quels sont les frais de livraison ?", "delivery"],
    ["Vous livrez à Tanger ?", "delivery"],
    ["Je peux payer par carte bancaire ?", "payment"],
    ["Quel est votre numéro WhatsApp ?", "contact"],
    ["Comment commander sur le site ?", "order"],
    ["Je veux retourner un produit", "returns"],
  ])("« %s » → %s", (message, intent) => {
    expect(detectSupportIntent(message)).toBe(intent);
  });

  it.each(["crème hydratante peau sèche", "traitement anti-chute", "solution pour lentilles de contact", "protection solaire SPF 50"])(
    "« %s » reste une recherche produit",
    (message) => {
      expect(detectSupportIntent(message)).toBeNull();
    }
  );

  it("répond avec les frais réellement configurés", () => {
    const reply = buildSupportReply("delivery", { shippingFlat: 29, freeShippingThreshold: 500 });
    expect(reply).toContain("29 DH");
    expect(reply).toContain("500 DH");
    expect(buildSupportReply("delivery", { shippingFlat: 0, freeShippingThreshold: 0 })).toContain("offerte");
  });

  it("n'annonce que le paiement à la livraison", () => {
    const reply = buildSupportReply("payment", { shippingFlat: 29, freeShippingThreshold: 500 });
    expect(reply).toMatch(/à la livraison/);
    expect(reply).toMatch(/n'est pas disponible/);
  });

  it("donne les coordonnées centralisées", () => {
    const reply = buildSupportReply("contact", { shippingFlat: 29, freeShippingThreshold: 500 });
    expect(reply).toContain(BUSINESS.phoneDisplay);
    expect(reply).toContain(BUSINESS.email);
    expect(reply).toContain("wa.me/212663488287");
  });
});

describe("tableau de bord — début de journée à Casablanca", () => {
  it("renvoie minuit heure de Casablanca (UTC+1)", () => {
    const now = new Date("2026-09-17T00:30:00Z"); // 01:30 à Casablanca
    expect(startOfBusinessDay(now).toISOString()).toBe("2026-09-16T23:00:00.000Z");
  });

  it("reste le même jour en fin de soirée", () => {
    const now = new Date("2026-09-17T21:30:00Z"); // 22:30 à Casablanca
    expect(startOfBusinessDay(now).toISOString()).toBe("2026-09-16T23:00:00.000Z");
  });
});

describe("administration — accès par rôle", () => {
  it("le gestionnaire catalogue ne voit ni clients, ni commandes, ni utilisateurs", () => {
    for (const href of ["/admin", "/admin/clients", "/admin/commandes", "/admin/utilisateurs", "/admin/journal"]) {
      expect(canAccessAdminSection("CATALOG_MANAGER", href)).toBe(false);
    }
    expect(canAccessAdminSection("CATALOG_MANAGER", "/admin/produits")).toBe(true);
  });

  it("le gestionnaire commandes voit commandes et clients mais pas les utilisateurs", () => {
    expect(canAccessAdminSection("ORDER_MANAGER", "/admin/commandes")).toBe(true);
    expect(canAccessAdminSection("ORDER_MANAGER", "/admin/clients")).toBe(true);
    expect(canAccessAdminSection("ORDER_MANAGER", "/admin/utilisateurs")).toBe(false);
    expect(canAccessAdminSection("ORDER_MANAGER", "/admin/quality")).toBe(false);
  });

  it("le super-admin accède à tout", () => {
    expect(hasPermission("SUPER_ADMIN", "users:read")).toBe(true);
    expect(canAccessAdminSection("SUPER_ADMIN", "/admin/journal")).toBe(true);
  });
});

describe("emails internes", () => {
  it("la notification de commande récapitule la commande et échappe le HTML", () => {
    const { subject, html } = renderEmail("new-order-admin", {
      orderId: 42,
      reference: "PB-2026-ABC",
      fullName: "<b>Salma</b>",
      phone: "0612345678",
      email: "salma@example.com",
      address: "12 rue des Orangers",
      city: "Casablanca",
      itemsText: "Crème × 2 — 200.00 DH\nGel × 1 — 50.00 DH",
      subtotal: "250.00",
      shipping: "29.00",
      discount: "0.00",
      total: "279.00",
      notes: null,
    });
    expect(subject).toBe("Nouvelle commande PB-2026-ABC — 279.00 DH");
    expect(html).toContain("&lt;b&gt;Salma&lt;/b&gt;");
    expect(html).toContain("Crème × 2");
    expect(html).toContain("/admin/commandes/42");
    expect(html).not.toContain("Remise");
  });

  it("le destinataire par défaut est l'email de la parapharmacie", () => {
    expect(businessNotificationEmail()).toBe(BUSINESS.email);
    process.env.BUSINESS_NOTIFICATION_EMAIL = "commandes@example.com";
    expect(businessNotificationEmail()).toBe("commandes@example.com");
  });
});

describe("formulaire de contact", () => {
  function form(fields: Record<string, string>) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    return fd;
  }

  it("accepte un message sans sujet et prévient la parapharmacie", async () => {
    const res = await submitContact(
      form({ name: "Salma", email: "Salma@Example.com", phone: "06 12 34 56 78", message: "Bonjour, avez-vous ce produit ?" })
    );
    expect(res).toEqual({ ok: true });
    expect(dbMock.activityLog.create).toHaveBeenCalledOnce();
    expect(emailMock.sendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({ template: "contact-admin", replyTo: "salma@example.com", to: BUSINESS.email })
    );
    const data = emailMock.sendTransactionalEmail.mock.calls[0][0].data;
    expect(data.subject).toBe("Demande de contact");
    expect(data.phone).toBe("06 12 34 56 78");
  });

  it("ignore silencieusement les robots (champ piège)", async () => {
    const res = await submitContact(form({ name: "Bot", email: "bot@example.com", message: "Achetez maintenant !!!", website: "http://spam" }));
    expect(res).toEqual({ ok: true });
    expect(dbMock.activityLog.create).not.toHaveBeenCalled();
    expect(emailMock.sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("refuse un message trop court", async () => {
    const res = await submitContact(form({ name: "A", email: "a@example.com", message: "court" }));
    expect(res.ok).toBe(false);
    expect(emailMock.sendTransactionalEmail).not.toHaveBeenCalled();
  });
});
