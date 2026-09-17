import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  product: { findMany: vi.fn() },
  chatSession: { upsert: vi.fn(), findUnique: vi.fn() },
  chatMessage: { create: vi.fn() },
  chatNeed: { findUnique: vi.fn(), upsert: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));
// Le limiteur de débit n'est pas l'objet de ces tests.
vi.mock("@/lib/security/rate-limit", () => ({
  RATE_LIMITS: { chat: { maxRequests: 10, windowSeconds: 60, keyPrefix: "chat" } },
  checkRateLimit: () => ({ allowed: true, remaining: 10, resetAt: Date.now() + 60_000 }),
  getClientIp: () => "127.0.0.1",
}));

import {
  buildMedicalSafetyReply,
  detectMedicalRequest,
  findProductsForChat,
  MEDICAL_SAFETY_REPLY,
  parseNeed,
} from "../src/lib/chat";
import { POST } from "../src/app/api/chat/route";

type Row = {
  id: number;
  name: string;
  brand: string | null;
  shortDescription: string | null;
  description: string | null;
};

function product(row: Row) {
  return {
    ...row,
    slug: `produit-${row.id}`,
    price: 100,
    promoPrice: null,
    searchText: parseNeed(`${row.name} ${row.brand ?? ""}`).keywords.join(" "),
    soldCount: 80,
    images: [],
  };
}

const CATALOGUE = [
  product({ id: 1, name: "Crème Hydratante Peau Sèche 50 ml", brand: "Avène", shortDescription: "Nourrit les peaux sèches.", description: null }),
  product({ id: 2, name: "Laque Fixation Forte 237 ml", brand: "Sexy Hair", shortDescription: "Tenue longue durée.", description: null }),
  product({ id: 3, name: "Lait Relais 2e âge 800 g", brand: "Modilac", shortDescription: "Lait infantile.", description: null }),
  product({ id: 4, name: "Traitement Anti-Chute Ampoules", brand: "Ducray", shortDescription: "Chute de cheveux réactionnelle.", description: null }),
];

async function ask(message: string) {
  const request = new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, sessionKey: "test-session" }),
  });
  const response = await POST(request as never);
  return (await response.json()) as { reply: string; products: unknown[] };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ANTHROPIC_API_KEY;
  dbMock.product.findMany.mockResolvedValue(CATALOGUE);
  dbMock.chatSession.upsert.mockResolvedValue({ id: 1 });
  dbMock.chatSession.findUnique.mockResolvedValue(null);
  dbMock.chatMessage.create.mockResolvedValue({});
  dbMock.chatNeed.findUnique.mockResolvedValue(null);
  dbMock.chatNeed.upsert.mockResolvedValue({});
});

const MEDICAL_QUESTIONS = [
  "Quel antibiotique prendre pour une infection ?",
  "Quel médicament prendre pour une infection urinaire ?",
  "Quelle posologie prendre ?",
  "Quel traitement médical prendre ?",
  "Que dois-je prendre pour traiter cette infection ?",
  "Peux-tu me prescrire un traitement ?",
  "Peux-tu me prescrire quelque chose ?",
  "Quel choix thérapeutique ?",
  "Quel choix thérapeutique pour cette maladie ?",
  "Quel médicament dois-je utiliser ?",
  "Quel antibiotique est le meilleur ?",
];

const SHOPPING_QUERIES = [
  "traitement anti-chute",
  "shampoing anti-chute",
  "crème hydratante peau sèche",
  "sérum anti-taches",
  "soin acné",
  "protection solaire SPF 50",
  "gel nettoyant peau grasse",
  "crème réparatrice",
];

describe("detectMedicalRequest", () => {
  it.each(MEDICAL_QUESTIONS)("bloque la décision médicale : %s", (message) => {
    expect(detectMedicalRequest(message)).toBe(true);
  });

  it.each(SHOPPING_QUERIES)("laisse passer la recherche parapharmacie : %s", (message) => {
    expect(detectMedicalRequest(message)).toBe(false);
  });
});

describe("réponse de sécurité", () => {
  it("oriente vers un pharmacien ou un médecin sans nommer de médicament", () => {
    const reply = buildMedicalSafetyReply("Quel antibiotique prendre pour une infection ?");
    expect(reply).toBe(MEDICAL_SAFETY_REPLY);
    expect(reply).toMatch(/pharmacien/);
    expect(reply).toMatch(/médecin/);
    expect(reply).not.toMatch(/\d+\s?(mg|ml|comprim)/i);
    expect(reply).not.toMatch(/urgences/);
  });

  it("ne mentionne les urgences qu'en présence de signes d'alerte", () => {
    expect(buildMedicalSafetyReply("infection avec forte fièvre et malaise")).toMatch(/urgences/);
  });
});

describe("POST /api/chat sans clé IA", () => {
  it.each(MEDICAL_QUESTIONS)("aucun produit pour « %s »", async (message) => {
    const body = await ask(message);
    expect(body.products).toEqual([]);
    expect(body.reply).toBe(MEDICAL_SAFETY_REPLY);
    expect(dbMock.product.findMany).not.toHaveBeenCalled();
  });

  it("la recherche produit normale reste pertinente", async () => {
    const body = await ask("Je cherche une crème hydratante pour peau sèche");
    expect(body.products.map((p) => (p as { id: number }).id)).toEqual([1]);
  });

  it("« traitement anti-chute » reste une recherche produit", async () => {
    const body = await ask("traitement anti-chute");
    expect(body.products.map((p) => (p as { id: number }).id)).toEqual([4]);
  });

  it("aucun produit au hasard sans correspondance", async () => {
    const body = await ask("zzqxw introuvable ailleurs");
    expect(body.products).toEqual([]);
  });
});

describe("findProductsForChat", () => {
  it("les mots de question seuls ne produisent aucune correspondance", async () => {
    expect(parseNeed("Quel quelle comment prendre pour avec et").keywords).toEqual([]);
    await expect(findProductsForChat("Quel quelle comment prendre pour avec et")).resolves.toEqual([]);
    expect(dbMock.product.findMany).not.toHaveBeenCalled();
  });

  it("ignore le contexte ajouté par la session", () => {
    const { keywords } = parseNeed("gel (contexte : recherche continue pour seche)");
    expect(keywords).toEqual(expect.arrayContaining(["gel", "seche"]));
    for (const word of ["contexte", "recherche", "continue"]) expect(keywords).not.toContain(word);
  });

  it("filtre la requête catalogue sur les termes du besoin", async () => {
    await findProductsForChat("crème peau sèche");
    const where = JSON.stringify(dbMock.product.findMany.mock.calls[0][0].where);
    expect(where).toContain("searchText");
    expect(where).toContain("creme");
    expect(where).not.toContain("\"quel\"");
  });

  it("un synonyme seul ne suffit pas (pas de lait infantile pour une crème)", async () => {
    const hits = await findProductsForChat("crème peau sèche");
    expect(hits.map((h) => h.id)).not.toContain(3);
    expect(hits.map((h) => h.id)).not.toContain(2);
  });
});
