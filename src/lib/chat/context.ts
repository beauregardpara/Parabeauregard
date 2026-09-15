/**
 * Contexte multi-tour du chat : mémoïsation du besoin produit par session.
 * Chaque message met à jour un ChatNeed (mots-clés + budget) qui sert à
 * garder l'assistant et la recherche produits sur le sujet.
 */

import { db } from "@/lib/db";
import { parseNeed } from "@/lib/chat";

export type ChatNeedContext = {
  keywords: string[];
  maxPrice: number | null;
  minPrice: number | null;
};

const MAX_KEYWORDS = 12;

function parseStoredKeywords(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === "string");
    }
  } catch {
    // Données corrompues : on repart d'une liste vide.
  }
  return [];
}

function mergeMaxPrice(a: number | null | undefined, b: number | null | undefined): number | null {
  const values = [a, b].filter((v): v is number => v != null);
  return values.length > 0 ? Math.max(...values) : null;
}

function mergeMinPrice(a: number | null | undefined, b: number | null | undefined): number | null {
  const values = [a, b].filter((v): v is number => v != null);
  return values.length > 0 ? Math.min(...values) : null;
}

/**
 * Enregistre le besoin exprimé par le message dans le ChatNeed de la session
 * (union des mots-clés, min/max des budgets tolérants aux valeurs nulles).
 */
export async function updateChatNeed(
  sessionKey: string,
  message: string
): Promise<ChatNeedContext> {
  const session = await db.chatSession.upsert({
    where: { sessionKey },
    update: {},
    create: { sessionKey },
  });

  const current = parseNeed(message);
  const existing = await db.chatNeed.findUnique({ where: { sessionId: session.id } });

  const storedKeywords = parseStoredKeywords(existing?.keywords ?? null);
  const keywords = [...new Set([...storedKeywords, ...current.keywords])].slice(0, MAX_KEYWORDS);

  const maxPrice = mergeMaxPrice(existing?.maxPrice, current.maxPrice);
  const minPrice = mergeMinPrice(existing?.minPrice, current.minPrice);

  const data = { keywords: JSON.stringify(keywords), maxPrice, minPrice };
  await db.chatNeed.upsert({
    where: { sessionId: session.id },
    update: data,
    create: { sessionId: session.id, ...data },
  });

  return { keywords, maxPrice, minPrice };
}

/** Renvoie le besoin mémorisé de la session, ou null (ne lève jamais). */
export async function getChatNeed(sessionKey: string): Promise<ChatNeedContext | null> {
  try {
    const session = await db.chatSession.findUnique({
      where: { sessionKey },
      include: { needs: true },
    });
    const need = session?.needs;
    if (!need) return null;
    return {
      keywords: parseStoredKeywords(need.keywords),
      maxPrice: need.maxPrice,
      minPrice: need.minPrice,
    };
  } catch {
    return null;
  }
}

/**
 * Quand le message utilisateur est très court (< 3 mots) et qu'un besoin est
 * déjà connu, on y ajoute une précision de contexte pour rester sur le sujet.
 */
export function applyContextToMessage(
  message: string,
  need: ChatNeedContext | null,
  enableIfShort: boolean
): string {
  const trimmed = message.trim();
  if (!need || !enableIfShort) return trimmed;

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 3) return trimmed;

  const parts: string[] = [];
  if (need.keywords.length > 0) {
    parts.push(`recherche continue pour ${need.keywords.join(", ")}`);
  }
  if (need.maxPrice != null) parts.push(`budget max ${need.maxPrice} DH`);
  if (need.minPrice != null) parts.push(`à partir de ${need.minPrice} DH`);
  if (parts.length === 0) return trimmed;

  return `${trimmed} (contexte : ${parts.join("; ")})`;
}