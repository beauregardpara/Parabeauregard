/**
 * Mise en forme des libellés produits (Para Beauregard).
 *
 * Les sources scrapées renvoient des noms entièrement en capitales
 * (« LA ROCHE POSAY MELA B3 SERUM CONCENTRE 30 ML »), ce qui donne au catalogue
 * un aspect brut. Ce module les remet en casse de titre sans altérer les
 * informations : références alphanumériques, sigles et unités sont préservés.
 *
 * On ne retouche QUE les libellés majoritairement en capitales : un nom déjà
 * correctement composé est renvoyé tel quel.
 */

/** Sigles et mentions qui doivent rester en capitales. */
const ACRONYMS = new Set([
  "SPF", "UV", "UVA", "UVB", "IP", "DS", "SA", "AHA", "BHA", "PHA", "BB", "CC", "DD",
  "HD", "LED", "EDT", "EDP", "PH", "AC", "AH", "XL", "XXL", "SOS", "ADN", "DNA",
  "Q10", "C25", "K-OX", "B77", "H2O", "3D", "2D", "OX", "NCEF", "HFSC", "SVR",
  "ACM", "IDC", "MDC", "DCP", "AQC", "TV", "USB", "IPL",
]);

/** Unités de conditionnement, écrites en minuscules. */
const UNITS: Record<string, string> = {
  ML: "ml",
  L: "l",
  CL: "cl",
  G: "g",
  KG: "kg",
  MG: "mg",
  GR: "g",
};

/** Mots outils français, en minuscules sauf en tête de libellé. */
const SMALL_WORDS = new Set([
  "a", "à", "au", "aux", "de", "des", "du", "en", "et", "la", "le", "les", "ou",
  "par", "pour", "sans", "sur", "un", "une",
]);

/** Un libellé est considéré « crié » si ses lettres sont très majoritairement capitales. */
function isShouting(name: string): boolean {
  const letters = name.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length < 6) return false;
  const upper = letters.replace(/[^A-ZÀ-Þ]/g, "").length;
  return upper / letters.length >= 0.8;
}

function formatToken(token: string, index: number): string {
  const bare = token.replace(/[^A-Za-z0-9+%-]/g, "");
  if (!bare) return token;

  const upper = bare.toUpperCase();

  // Unité de conditionnement (« 30 ML » → « 30 ml »).
  if (UNITS[upper]) return token.replace(bare, UNITS[upper]);

  // Sigle connu : on garde les capitales.
  if (ACRONYMS.has(upper)) return token.replace(bare, upper);

  // Référence alphanumérique (« B3 », « 5-36 », « 340G ») : inchangée.
  if (/\d/.test(bare)) {
    // « 340G » / « 100ML » : la partie unité passe en minuscules.
    const m = bare.match(/^(\d+[.,]?\d*)([A-Za-z]+)$/);
    if (m && UNITS[m[2].toUpperCase()]) {
      return token.replace(bare, `${m[1]} ${UNITS[m[2].toUpperCase()]}`);
    }
    return token;
  }

  const lower = bare.toLowerCase();

  // Mot outil : minuscule, sauf en première position.
  if (index > 0 && SMALL_WORDS.has(lower)) return token.replace(bare, lower);

  // Une seule lettre isolée (« C », « K ») : capitale.
  if (bare.length === 1) return token.replace(bare, upper);

  // Casse appliquée à chaque suite de lettres, afin de préserver la ponctuation
  // interne (« L'OREAL » → « L'Oreal », « GYN-PHY » → « Gyn-Phy »).
  return token.replace(/[A-Za-zÀ-ÿ]+/g, (run) => {
    const runUpper = run.toUpperCase();
    if (ACRONYMS.has(runUpper)) return runUpper;
    const runLower = run.toLowerCase();
    return runLower.charAt(0).toUpperCase() + runLower.slice(1);
  });
}

/** Clé de comparaison insensible à la casse, aux accents et à la ponctuation. */
function loose(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Texte à partir duquel construire le slug d'un produit : « marque + libellé »,
 * sans répéter la marque quand le libellé la contient déjà en tête.
 */
export function productSlugSource(name: string, brand?: string | null): string {
  const cleanName = (name ?? "").replace(/\s+/g, " ").trim();
  if (!brand) return cleanName;
  const brandKey = loose(brand);
  const nameKey = loose(cleanName);
  if (brandKey && (nameKey === brandKey || nameKey.startsWith(`${brandKey} `))) return cleanName;
  return `${brand} ${cleanName}`.trim();
}

/**
 * Remplace le préfixe de marque du libellé par son écriture officielle
 * (« CERAVE SA CREME… » + marque « CeraVe » → « CeraVe SA Creme… »).
 */
function applyBrandPrefix(name: string, brand: string): string {
  const brandKey = loose(brand);
  if (!brandKey) return name;

  const tokens = name.split(" ");
  // On teste les préfixes du plus long au plus court (marques multi-mots).
  for (let take = Math.min(tokens.length, 4); take >= 1; take--) {
    if (loose(tokens.slice(0, take).join(" ")) === brandKey) {
      return [brand, ...tokens.slice(take)].join(" ");
    }
  }
  return name;
}

/**
 * Remet un libellé produit en casse de titre lisible.
 * Renvoie le libellé inchangé s'il n'est pas écrit en capitales.
 *
 * @param name  libellé brut
 * @param brand marque canonique du produit ; si le libellé commence par elle,
 *              son écriture officielle est restituée.
 */
export function formatProductName(name: string | null | undefined, brand?: string | null): string {
  if (!name) return "";
  const cleaned = name.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  const cased = isShouting(cleaned)
    ? cleaned
        .split(" ")
        .map((token, i) => formatToken(token, i))
        .join(" ")
    : cleaned;

  return brand ? applyBrandPrefix(cased, brand) : cased;
}

/**
 * Texte de recherche replié d'un produit : minuscules, sans accents ni
 * ponctuation. SQLite compare les `LIKE` octet à octet — sans ce champ,
 * « avene » ne trouverait jamais « Avène », ce que tapent pourtant la plupart
 * des visiteurs.
 */
export function buildSearchText(parts: (string | null | undefined)[]): string {
  const folded = foldForSearch(parts.filter(Boolean).join(" "));
  // Variante compacte : « l oreal » (issu de « L'Oréal ») doit aussi se trouver
  // en tapant « loreal », sans apostrophe ni espace.
  const compact = folded.replace(/\s+/g, "");
  return compact && compact !== folded ? `${folded} ${compact}` : folded;
}

/** Replie une chaîne (requête ou libellé) pour une comparaison sans accents. */
export function foldForSearch(value: string): string {
  return loose(value);
}
