import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { buildMedicalSafetyReply, detectMedicalRequest, findProductsForChat, type ChatProductHit } from "@/lib/chat";
import { applyContextToMessage, getChatNeed, updateChatNeed } from "@/lib/chat/context";
import { buildSupportReply, detectSupportIntent, getSupportInfo } from "@/lib/chat/support";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/security/rate-limit";
import { logger, newRequestId } from "@/lib/logger";

const ChatRequestSchema = z.object({
  message: z.string().min(1, "Message vide").max(1000, "Message trop long"),
  sessionKey: z.string().max(80).optional(),
});

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

const SYSTEM_PROMPT = `Tu es l'assistant de Para Beauregard, une parapharmacie en ligne marocaine.
Ton rôle : orienter le client vers les produits du catalogue qui correspondent le mieux à son besoin
(type de peau ou de cheveux, problème ciblé, budget en dirhams marocains, préférences de marque).

RÈGLES ABSOLUES :
1. Tu ne recommandes QUE des produits renvoyés par l'outil rechercher_produits. N'invente JAMAIS un
   produit, une marque, un prix ou une disponibilité non présents dans les résultats d'outil.
2. Recommande 2 à 4 produits maximum, chacun avec : nom exact, marque, prix en DH et un argument court.
3. Si le besoin est trop vague (ex. « je veux une crème »), pose UNE question de clarification courte
   (type de peau ? budget ? problème précis ?) avant de recommander.
4. Jamais de diagnostic ni de conseil médical. Oriente vers un pharmacien/médecin pour tout problème de santé.
5. Ton chaleureux, professionnel, concis (3 à 6 phrases max). Réponds toujours en français.
6. Prix : mentionne-les tels que renvoyés par l'outil (ex. « 149,50 DH »).`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "rechercher_produits",
    description:
      "Recherche dans le catalogue réel de la parapharmacie. Renvoie uniquement des produits publiés et disponibles.",
    input_schema: {
      type: "object" as const,
      properties: {
        requete: { type: "string", description: "Mots-clés libres du besoin (ex. 'crème peau sèche sensitive')" },
        prix_max: { type: "number", description: "Budget maximum en DH" },
        prix_min: { type: "number", description: "Prix minimum en DH (optionnel)" },
      },
      required: ["requete"],
    },
  },
];

type ChatProductPayload = {
  reply: string;
  products: ChatProductHit[];
};

async function callClaude(
  history: { role: "user" | "assistant"; content: string }[],
  apiKey: string
): Promise<ChatProductPayload> {
  const client = new Anthropic({ apiKey, maxRetries: 2 });
  const messages: Anthropic.MessageParam[] = [...history];
  let products: ChatProductHit[] = [];

  const run = (async (): Promise<ChatProductPayload> => {
    for (let turn = 0; turn < 4; turn++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 900,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });

      if (response.stop_reason !== "tool_use") {
        const textBlock = response.content.find((c) => c.type === "text");
        const text = textBlock?.type === "text" ? textBlock.text : "";
        return { reply: text, products };
      }

      // Exécuter les outils demandés puis relancer le modèle
      messages.push({ role: "assistant", content: response.content });
      const results: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const input = block.input as { requete?: string; prix_max?: number; prix_min?: number };
        const query = [input.requete ?? "", ...history.map((m) => m.content).slice(-2)].join(" ").trim();
        let hits = await findProductsForChat(query || "parapharmacie", 8);
        if (input.prix_max != null) {
          hits = hits.filter((h) => (h.promoPrice ?? h.price) <= input.prix_max!);
        }
        if (input.prix_min != null) {
          hits = hits.filter((h) => (h.promoPrice ?? h.price) >= input.prix_min!);
        }
        if (products.length === 0 && hits.length > 0) products = hits;

        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(
            hits.slice(0, 8).map((h) => ({
              id: h.id,
              nom: h.name,
              marque: h.brand,
              prix_dh: h.promoPrice ?? h.price,
              en_promotion: h.promoPrice != null,
              url: `/produits/${h.slug}`,
            }))
          ),
        });
      }
      messages.push({ role: "user", content: results });
    }

    return { reply: "Voici ce que j'ai trouvé pour vous dans notre catalogue 👇", products };
  })();

  // Timeout global strict (le SDK Anthropic peut patienter plusieurs minutes par défaut)
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("CHAT_TIMEOUT")), 30000)
  );

  return await Promise.race([run, timeout]);
}

function buildFallbackReply(message: string, products: ChatProductHit[]): string {
  if (products.length === 0) {
    return "Je n'ai pas trouvé de produit correspondant à votre demande dans notre catalogue pour le moment. Pouvez-vous reformuler avec d'autres mots-clés, ou préciser votre besoin (type de peau, catégorie, budget) ?";
  }
  const lines = [
    `Voici ${products.length} produit(s) de notre catalogue qui pourraient vous convenir :`,
    ...products.map((p) => `• **${p.name}** — ${(p.promoPrice ?? p.price).toFixed(2)} DH${p.brand ? ` (${p.brand})` : ""}`),
    "",
    "Cliquez sur un produit ci-dessous pour voir sa fiche complète. Une précision à me donner ? Je suis là !",
  ];
  void message;
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    // Rate limiting
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip, RATE_LIMITS.chat);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans quelques instants." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const raw = await req.json();
    const parsed = ChatRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Requête invalide" }, { status: 400 });
    }
    const message = parsed.data.message.trim();
    const sessionKey = parsed.data.sessionKey ?? crypto.randomUUID();
    const session = await db.chatSession.upsert({
      where: { sessionKey },
      update: {},
      create: { sessionKey },
    });
    await db.chatMessage.create({ data: { sessionId: session.id, role: "user", content: message } });

    // Garde-fou santé déterministe, AVANT tout appel IA ou recherche catalogue :
    // aucune recommandation produit pour une demande de décision médicale.
    if (detectMedicalRequest(message)) {
      const reply = buildMedicalSafetyReply(message);
      await db.chatMessage.create({ data: { sessionId: session.id, role: "assistant", content: reply } });
      return NextResponse.json({ reply, products: [], sessionKey });
    }

    // Questions pratiques (livraison, paiement, contact…) : réponse factuelle
    // issue de la configuration, sans recommandation de produit.
    const supportIntent = detectSupportIntent(message);
    if (supportIntent) {
      const reply = buildSupportReply(supportIntent, await getSupportInfo());
      await db.chatMessage.create({ data: { sessionId: session.id, role: "assistant", content: reply } });
      return NextResponse.json({ reply, products: [], sessionKey });
    }

    // Contexte multi-tour : on mémoïse le besoin puis on l'injecte si le
    // message courant est trop court pour être exploitable seul.
    await updateChatNeed(sessionKey, message);
    const need = await getChatNeed(sessionKey);
    const contextualMessage = applyContextToMessage(message, need, true);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    let payload: ChatProductPayload;

    if (apiKey) {
      payload = await callClaude([{ role: "user", content: contextualMessage }], apiKey);
    } else {
      // Fallback local : recherche directe dans le catalogue (aucune invention possible)
      const hits = await findProductsForChat(contextualMessage, 4);
      payload = { reply: buildFallbackReply(contextualMessage, hits), products: hits };
    }

    // Ne jamais présenter plus de 4 produits
    payload.products = payload.products.slice(0, 4);

    await db.chatMessage.create({
      data: { sessionId: session.id, role: "assistant", content: payload.reply },
    });

    return NextResponse.json({ ...payload, sessionKey });
  } catch (err) {
    const timeout = err instanceof Error && err.message === "CHAT_TIMEOUT";
    logger.error("ai", timeout ? "chat.timeout" : "chat.error", {
      message: timeout
        ? "Timeout Anthropic après 30 s — fallback proposé au client"
        : err instanceof Error
          ? err.message
          : "inconnu",
      errorCode: timeout ? "CHAT_TIMEOUT" : "AI_ERROR",
      requestId,
      data: { anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY) },
    });
    return NextResponse.json(
      {
        reply:
          "Désolé, je rencontre une difficulté technique momentanée. Réessayez dans quelques instants 🙏",
        products: [],
      },
      { status: 200 }
    );
  }
}
