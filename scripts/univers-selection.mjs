/**
 * Choisit les produits qui composent les vignettes des univers.
 *
 * La selection est ecrite a la main, produit par produit : un tri automatique
 * par mot-cle rangeait un lecteur de glycemie dans « Complements » et un soin
 * anti-menopause dans « Hommes ». Trois marques differentes par vignette, et
 * des flacons de silhouettes variees.
 *
 * Les packshots portant un badge incruste (« recommande par les dermatologues »),
 * une mention detachee (« 50 ML ») ou un decor sont ecartes : detoures, ces
 * fragments flottent a cote du flacon. On prefere aussi les silhouettes hautes,
 * qu'un cadrage rond ne tranche pas.
 *
 * Le script verifie que chaque packshot est exploitable — le detourage de
 * univers-vignettes.mjs part du blanc des bords, donc une photo posee sur un
 * fond colore donnerait un decoupage sale — puis ecrit
 * <dossier>/univers-retenus.json.
 */
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const OUT = process.argv[2];
if (!OUT) { console.error("usage: node scripts/univers-selection.mjs <dossier-de-sortie>"); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

/** Identifiants produits, dans l'ordre : centre (le plus grand), gauche, droite. */
const SELECTION = {
  "soins-corps": [1177, 1155, 1309], // Xémose, Kuora Urea, Makari
  complements: [258, 266, 260], // Perfectil, Acérola, Oméga 3
  solaire: [936, 202, 1170], // Uriage Hyséac, ACM Medisun, Heliocare
  hommes: [1340, 1349, 1341], // Biotherm, Clarins, Nuxe Men
  "nature-bio": [252, 264, 1206], // Lotus Bio, Spiruline, Yazine
  marques: [1042, 950, 1006], // Eau Thermale Avène, Sensibio H2O, Uriage
};

/** Part des pixels du pourtour qui sont blancs ; en dessous de 92 %, on alerte. */
async function pureteDuFond(fichier) {
  const { data, info } = await sharp(fichier).flatten({ background: "#ffffff" })
    .raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  let blancs = 0, total = 0;
  const voir = (x, y) => {
    const i = (y * w + x) * c;
    total++;
    if (data[i] > 244 && data[i + 1] > 244 && data[i + 2] > 244) blancs++;
  };
  for (let x = 0; x < w; x++) { voir(x, 0); voir(x, h - 1); }
  for (let y = 0; y < h; y++) { voir(0, y); voir(w - 1, y); }
  return { purete: blancs / total, largeur: w, hauteur: h };
}

const db = new PrismaClient();
const retenus = {};
let alerte = false;

for (const [slug, ids] of Object.entries(SELECTION)) {
  const produits = await db.product.findMany({
    where: { id: { in: ids } },
    include: { images: { orderBy: { order: "asc" }, take: 1 } },
  });
  const parId = new Map(produits.map((p) => [p.id, p]));

  retenus[slug] = { retenus: [] };
  console.log(`\n${slug}`);
  for (const id of ids) {
    const p = parId.get(id);
    if (!p) { console.log(`  #${id} INTROUVABLE`); alerte = true; continue; }
    const url = p.images[0]?.url ?? "";
    const fichier = path.join("public", url);
    if (!url.startsWith("/uploads/") || !fs.existsSync(fichier)) {
      console.log(`  #${id} SANS PHOTO EXPLOITABLE (${url || "aucune image"})`);
      alerte = true;
      continue;
    }
    const { purete, largeur, hauteur } = await pureteDuFond(fichier);
    const drapeau = purete < 0.92 ? " ⚠ fond non blanc" : "";
    if (purete < 0.92) alerte = true;
    console.log(`  #${id} ${p.brand ?? "?"} — ${p.name} (${largeur}x${hauteur}, fond ${(purete * 100).toFixed(1)} %)${drapeau}`);
    retenus[slug].retenus.push({ id: p.id, brand: p.brand, name: p.name, url });
  }
}

fs.writeFileSync(path.join(OUT, "univers-retenus.json"), JSON.stringify(retenus, null, 2));
await db.$disconnect();
if (alerte) { console.error("\nAu moins un packshot est inexploitable : corriger la selection."); process.exit(1); }
