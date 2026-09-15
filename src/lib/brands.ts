/**
 * Normalisation des marques (Para Beauregard).
 *
 * Les sources scrapées renvoient des libellés de marque très hétérogènes :
 * « AVENE CICALFATE », « CERAVE CREME », « LA ROCHE », et parfois carrément un
 * nom de catégorie (« Hydratation corps »). Ce module ramène tout cela à un
 * référentiel de marques propre et affichable, utilisé :
 *  - à l'insertion par le scraper (src/lib/scraper/engine.ts) ;
 *  - par le script de normalisation du catalogue existant.
 *
 * Règles :
 *  1. les libellés non-marques (catégories, mots génériques) sont rejetés ;
 *  2. un alias connu est ramené à son nom canonique (« LA ROCHE » → « La Roche-Posay ») ;
 *  3. sinon on ne conserve que le premier mot, en casse de titre — les sources
 *     concatènent presque toujours « MARQUE + GAMME ».
 */

/** Marques canoniques : alias (en MAJUSCULES, sans accents) → nom affiché. */
const BRAND_ALIASES: Record<string, string> = {
  // ── Dermo-cosmétique ────────────────────────────────────────────
  "LA ROCHE": "La Roche-Posay",
  "LA ROCHE POSAY": "La Roche-Posay",
  "LAROCHE POSAY": "La Roche-Posay",
  LRP: "La Roche-Posay",
  AVENE: "Avène",
  BIODERMA: "Bioderma",
  CERAVE: "CeraVe",
  VICHY: "Vichy",
  URIAGE: "Uriage",
  SVR: "SVR",
  NUXE: "Nuxe",
  EUCERIN: "Eucerin",
  DUCRAY: "Ducray",
  KLORANE: "Klorane",
  "A DERMA": "A-Derma",
  ADERMA: "A-Derma",
  CETAPHIL: "Cetaphil",
  NEUTROGENA: "Neutrogena",
  ISDIN: "ISDIN",
  ISISPHARMA: "Isispharma",
  SESDERMA: "Sesderma",
  FILORGA: "Filorga",
  LIERAC: "Lierac",
  CAUDALIE: "Caudalie",
  CLARINS: "Clarins",
  CLINIQUE: "Clinique",
  BIOTHERM: "Biotherm",
  ESTHEDERM: "Esthederm",
  DERMACEUTIC: "Dermaceutic",
  NOVEXPERT: "Novexpert",
  PAYOT: "Payot",
  GUINOT: "Guinot",
  MATIS: "Matis",
  JANSSEN: "Janssen Cosmeceutical",
  HELIABRINE: "Heliabrine",
  REMESCAR: "Remescar",
  MEDICUBE: "Medicube",
  SOMEBYMI: "Some By Mi",
  "SOME BY MI": "Some By Mi",
  JAYJUN: "Jayjun",
  ACM: "ACM Laboratoire",
  CANTABRIA: "Cantabria Labs",
  GIFRER: "Gifrer",
  GILBERT: "Gilbert",
  "ROGE CAVAILLES": "Rogé Cavaillès",
  "ROGER ET": "Roger & Gallet",
  "ROGER GALLET": "Roger & Gallet",
  SANOFLORE: "Sanoflore",
  "PANIER DES": "Panier des Sens",
  "RITUEL D ORIENT": "Rituel d'Orient",
  RITUALS: "Rituals",
  ZIAJA: "Ziaja",
  BABE: "Babé",
  "LA CABINE": "La Cabine",
  DULCIMA: "Dulcima Cosmetics",
  ODARYM: "Odarym",
  DERMALIFT: "Dermalift",
  MAKARI: "Makari",
  HENDIYA: "Hendiya",
  FILLERINA: "Fillerina",
  "PFB VANISH": "PFB Vanish",

  // ── Cheveux ─────────────────────────────────────────────────────
  KERASTASE: "Kérastase",
  "L OREAL": "L'Oréal",
  LOREAL: "L'Oréal",
  OLAPLEX: "Olaplex",
  CRESCINA: "Crescina",
  BIOKAP: "Biokap",
  NATURTINT: "Naturtint",
  ERAYBA: "Erayba",
  "BJORN AXEN": "Björn Axén",
  "SEXY HAIR": "Sexy Hair",
  GOT2B: "got2b",
  BATISTE: "Batiste",
  FURTERER: "René Furterer",
  "RENE FURTERER": "René Furterer",

  // ── Corps, hygiène, accessoires ─────────────────────────────────
  VASELINE: "Vaseline",
  CARMEX: "Carmex",
  LANSINOH: "Lansinoh",
  BETER: "Beter",
  ECOTOOLS: "EcoTools",
  MAVALA: "Mavala",
  HEROME: "Herôme",
  INNOXA: "Innoxa",
  "GOLDEN ROSE": "Golden Rose",
  "IDC INSTITUTE": "IDC Institute",
  "REVOX B77": "Revox B77",
  REVOX: "Revox B77",
  QUIES: "Quies",
  STERIMAR: "Stérimar",
  STERILUX: "Sterilux",
  MANIX: "Manix",
  "DR SCHOLLS": "Dr. Scholl's",
  "DR PAWPAW": "Dr. PAWPAW",
  "BIO OIL": "Bio-Oil",
  SOMATOLINE: "Somatoline Cosmetic",
  "MARIE ROSE": "Marie Rose",
  POUXID: "Pouxid",
  "DEEP FREEZE": "Deep Freeze",
  "ACCU CHEK": "Accu-Chek",
  PHILIPS: "Philips",
  MEGAPLAST: "Megaplast",
  VAPORHUM: "Vaporhum",
  BIOSTOP: "Biostop",
  POLARIS: "Polaris",

  // ── Hygiène féminine / incontinence / bébé ──────────────────────
  ABENA: "Abena",
  HARTMANN: "Hartmann",
  MOLICARE: "MoliCare",
  TADAM: "Tadam",
  HIPP: "HiPP",
  MODILAC: "Modilac",
  PHY: "Phy Bébé",
  SALUSTAR: "Salustar",

  // ── Compléments alimentaires ────────────────────────────────────
  "FORTE PHARMA": "Forté Pharma",
  "ERIC FAVRE": "Eric Favre",
  DOPPELHERZ: "Doppelherz",
  PERFECTIL: "Perfectil",
  BIOFAR: "Biofar",
  PURASANA: "Purasana",
  SANTAROME: "Santarome",
  HOLISTICA: "Holistica",
  DIETAROMA: "Dietaroma",
  FENIOUX: "Fenioux",
  PHYSALIS: "Physalis",
  NUTRIMAX: "Nutrimax",
  TILMAN: "Tilman",

  // ── Naturel / bio / divers ──────────────────────────────────────
  AVRIL: "Avril",
  WAAM: "Waam",
  "SO BIO": "So Bio étic",
  "LEA NATURE": "Léa Nature",
  "DOUCE NATURE": "Douce Nature",
  "LOTUS BIO": "Lotus Bio",
  NATURALIA: "Naturalia",
  "ST DALFOUR": "St Dalfour",
  "THE CHEEKY": "The Cheeky Panda",
  "CAMOMILLA BLU": "Camomilla Blu",
  "COSMETIC CLUB": "Cosmetic Club",
  "LILI CARE": "Lili Care",
  "NEW DERM": "New Derm",
  JERRAFLORE: "Jerraflore",
  KUORA: "Kuora",
  AQC: "AQC",
  MDC: "MDC",
  DCP: "DCP",
  BOTANIKA: "Botanika",
  ACURE: "Acure",
  ADDAX: "Addax",
  ABSOLUTE: "Absolute",
  AURACOS: "Auracos",
  AROMESSENCE: "Aromessence",
  ESCENTUALS: "Escentuals",
  LEAL: "Leal Cosmetics",
  YAZINE: "Yazine",
  HYDROGEL: "Hydrogel",
};

/**
 * Libellés qui ne sont pas des marques : catégories, familles de produits,
 * mots génériques renvoyés par certaines fiches sources.
 */
const NON_BRANDS = new Set([
  "acne & imperfections",
  "acne et imperfections",
  "hydratation corps",
  "hydratation visage",
  "nettoyants & demaquillants",
  "nettoyants et demaquillants",
  "cicatrisation & reparation",
  "soins cibles",
  "soins visage",
  "soins cheveux",
  "soins corps",
  "anti-age",
  "anti age",
  "protection solaire",
  "complements alimentaires",
  "hygiene corps",
  "bebe & maman",
  "bebe maman",
  "minceur",
  "vitamines",
  "shampoings",
  "anti-chute",
  "promotion",
  "promotions",
  "nouveaute",
  "nouveautes",
  "offre",
  "offres",
  "divers",
  "autre",
  "autres",
  "sans marque",
  "generique",
  "n a",
  "na",
]);

/** Accents retirés + majuscules + espaces normalisés (clé de comparaison). */
function key(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`]/g, " ")
    .replace(/[^A-Za-z0-9+&-]+/g, " ")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

/** Casse de titre respectueuse des particules françaises. */
function titleCase(value: string): string {
  const small = new Set(["de", "des", "du", "et", "la", "le", "les"]);
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) => (i > 0 && small.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

/** Index inverse : clé normalisée d'un nom canonique → ce nom canonique. */
const CANONICAL_BY_KEY = new Map<string, string>(
  Object.values(BRAND_ALIASES).map((name) => [key(name), name])
);

/**
 * Ramène un libellé de marque brut à son nom canonique.
 *
 * @param raw     libellé renvoyé par la source (peut être nul / bruité)
 * @param options `extraNonBrands` permet d'injecter les noms de catégories
 *                réels de la base afin de les rejeter dynamiquement.
 * @returns le nom de marque affichable, ou `null` si aucune marque exploitable.
 */
export function normalizeBrand(
  raw: string | null | undefined,
  options?: { extraNonBrands?: Iterable<string> }
): string | null {
  if (!raw) return null;

  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  // Rejet des libellés non-marques (liste statique + catégories réelles).
  const flat = key(cleaned).toLowerCase();
  if (NON_BRANDS.has(flat)) return null;
  if (options?.extraNonBrands) {
    for (const label of options.extraNonBrands) {
      if (key(label).toLowerCase() === flat) return null;
    }
  }

  const k = key(cleaned);
  if (!k || k.length < 2) return null;
  // Un libellé purement numérique n'est jamais une marque.
  if (/^[0-9\s+-]+$/.test(k)) return null;

  // Un nom déjà canonique se reconnaît lui-même (garantit l'idempotence même
  // pour les noms ponctués comme « Dr. Scholl's » que `key()` réduit).
  const canonical = CANONICAL_BY_KEY.get(k);
  if (canonical) return canonical;

  // Variante sans trait d'union : « A-DERMA » et « A DERMA » désignent la même marque.
  const variants = [k, k.replace(/-/g, " ").replace(/\s+/g, " ").trim()];

  for (const variant of variants) {
    // 1. Alias exact.
    if (BRAND_ALIASES[variant]) return BRAND_ALIASES[variant];

    // 2. Alias sur un préfixe de mots (« AVENE CICALFATE » → « AVENE »).
    const parts = variant.split(" ");
    for (let take = Math.min(parts.length, 3); take >= 1; take--) {
      const candidate = parts.slice(0, take).join(" ");
      if (BRAND_ALIASES[candidate]) return BRAND_ALIASES[candidate];
    }
  }

  const words = k.split(" ");

  // 3. Repli : les sources concatènent « MARQUE + GAMME », on garde le 1er mot.
  const first = words[0];
  if (!first || first.length < 2 || /^[0-9]+$/.test(first)) return null;
  return titleCase(first);
}

/** Liste des noms de marques canoniques connus (utile pour l'admin / les tests). */
export function knownBrands(): string[] {
  return Array.from(new Set(Object.values(BRAND_ALIASES))).sort((a, b) => a.localeCompare(b, "fr"));
}
