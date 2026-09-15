// ============================================================================
// IMAGES PRODUITS — filet de secours déterministe (même principe que le projet
// de référence) : si une photo réelle ne charge pas, on bascule vers une
// illustration SVG thématique cohérente, jamais d'icône cassée à l'écran.
// ============================================================================

export const FALLBACK_IMAGES = [
  "/products/flacon.svg",
  "/products/cream-jar.svg",
  "/products/serum-dropper.svg",
  "/products/pump-bottle.svg",
  "/products/tube-solaire.svg",
  "/products/spray.svg",
  "/products/pilules.svg",
  "/products/boite-soins.svg",
  "/products/biberon.svg",
  "/products/savon.svg",
] as const;

type KeywordMap = Record<string, string>;

const KEYWORD_FALLBACKS: KeywordMap[] = [
  { solaire: "/products/tube-solaire.svg", uv: "/products/tube-solaire.svg", spf: "/products/tube-solaire.svg" },
  { crème: "/products/cream-jar.svg", creme: "/products/cream-jar.svg", hydratant: "/products/cream-jar.svg", lotion: "/products/cream-jar.svg" },
  { sérum: "/products/serum-dropper.svg", serum: "/products/serum-dropper.svg", vitamine: "/products/serum-dropper.svg" },
  { shampoo: "/products/pump-bottle.svg", cheveu: "/products/pump-bottle.svg", capillaire: "/products/pump-bottle.svg" },
  { micellaire: "/products/flacon.svg", démaquillant: "/products/flacon.svg", demaquillant: "/products/flacon.svg", nettoyant: "/products/flacon.svg" },
  { gélule: "/products/pilules.svg", gelule: "/products/pilules.svg", complément: "/products/boite-soins.svg", comp: "/products/boite-soins.svg", magnésium: "/products/boite-soins.svg", fer: "/products/boite-soins.svg" },
  { bébé: "/products/biberon.svg", bebe: "/products/biberon.svg", biberon: "/products/biberon.svg", bébés: "/products/biberon.svg" },
  { savon: "/products/savon.svg", douche: "/products/savon.svg", corps: "/products/savon.svg", gel: "/products/savon.svg", gommage: "/products/savon.svg" },
  { spray: "/products/spray.svg", brume: "/products/spray.svg", eau: "/products/spray.svg" },
];

export function normalizeFallbackKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Illustration de secours choisie selon le libellé du produit. */
export function pickFallbackImage(seed?: string | null): string {
  if (seed) {
    for (const map of KEYWORD_FALLBACKS) {
      for (const [keyword, path] of Object.entries(map)) {
        if (normalizeFallbackKey(seed).includes(normalizeFallbackKey(keyword))) return path;
      }
    }
  }
  // Sélection déterministe (comme le hash marque/modèle du projet de référence)
  const h = seed ?? "";
  let hash = 0;
  for (let i = 0; i < h.length; i++) {
    hash = (hash << 5) - hash + h.charCodeAt(i);
    hash |= 0;
  }
  return FALLBACK_IMAGES[Math.abs(hash) % FALLBACK_IMAGES.length];
}