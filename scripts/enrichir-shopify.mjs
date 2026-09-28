/**
 * Prepare les fiches issues de l'index Shopify.
 *
 * Contrairement au premier revendeur, le prix et la description sont deja dans
 * l'index : il ne reste qu'a telecharger la photo et a verifier qu'elle est
 * exploitable. Une fiche sans description lisible ou sans visuel correct n'est
 * pas retenue — mieux vaut un produit de moins qu'une fiche bancale en
 * boutique.
 *
 * Entree : <dossier>/trouves2.json — Sortie : <dossier>/fiches2.json
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const DOSSIER = process.argv[2];
if (!DOSSIER) { console.error("usage: node scripts/enrichir-shopify.mjs <dossier>"); process.exit(1); }
const IMAGES = path.join(DOSSIER, "images2");
fs.mkdirSync(IMAGES, { recursive: true });

const UA = "Mozilla/5.0 (compatible; ParaBeauregardBot/1.0; +https://parabeauregard.ma)";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** Part de pixels clairs sur le pourtour : un packshot est detoure sur blanc. */
async function fondBlanc(fichier) {
  const { data, info } = await sharp(fichier).flatten({ background: "#ffffff" })
    .raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  let blancs = 0, total = 0;
  const voir = (x, y) => {
    const i = (y * w + x) * c;
    total++;
    if (data[i] > 242 && data[i + 1] > 242 && data[i + 2] > 242) blancs++;
  };
  for (let x = 0; x < w; x++) { voir(x, 0); voir(x, h - 1); }
  for (let y = 0; y < h; y++) { voir(0, y); voir(w - 1, y); }
  return { purete: blancs / total, largeur: w, hauteur: h };
}

const cibles = JSON.parse(fs.readFileSync(path.join(DOSSIER, "trouves2.json"), "utf8"));
const index = JSON.parse(fs.readFileSync(path.join(DOSSIER, "index-shopify.json"), "utf8"));

/** Libelle replie, pour rapprocher la meme reference d'une boutique a l'autre. */
const replier = (t) =>
  (t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Description de secours prise chez une autre boutique.
 *
 * Ces catalogues laissent souvent le champ vide, alors que le produit, le prix
 * et la photo sont bons. Plutot que d'ecarter la fiche — ou pire, d'inventer un
 * texte — on reprend la description que donne un autre revendeur pour la meme
 * reference.
 */
function descriptionDeSecours(fiche) {
  const cle = replier(fiche.nom);
  const mots = cle.split(" ").filter((m) => m.length > 2);
  if (mots.length < 3) return null;
  let meilleure = null;
  for (const f of index) {
    if (f.url === fiche.url) continue;
    if (!f.description || f.description.length < 120) continue;
    const autre = replier(f.nom);
    // Tous les mots significatifs doivent s'y retrouver : c'est bien la meme
    // reference, pas seulement la meme gamme.
    if (!mots.every((m) => autre.includes(m))) continue;
    if (!meilleure || f.description.length > meilleure.description.length) meilleure = f;
  }
  return meilleure;
}
const fiches = [], rejets = [];

for (const [i, c] of cibles.entries()) {
  const r = c.revendeur;
  try {
    let description = r.description;
    let sourceDescription = r.url;
    if (!description || description.length < 120) {
      const secours = descriptionDeSecours(r);
      if (secours) { description = secours.description; sourceDescription = secours.url; }
    }
    if (!description || description.length < 120) {
      throw new Error(`description trop courte (${description?.length ?? 0})`);
    }
    if (!Number.isFinite(r.prix) || r.prix <= 0) throw new Error("prix absent");

    // Shopify sert l'original sans parametre de taille ; on le demande en
    // grand format explicite pour eviter une vignette.
    const url = r.image.replace(/(\.(jpe?g|png|webp))(\?.*)?$/i, "_1200x$1");
    let img = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(45000) });
    if (!img.ok) img = await fetch(r.image, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(45000) });
    if (!img.ok) throw new Error(`image ${img.status}`);

    const fichier = path.join(IMAGES, `${c.ligne}.img`);
    fs.writeFileSync(fichier, Buffer.from(await img.arrayBuffer()));

    const { purete, largeur, hauteur } = await fondBlanc(fichier);
    if (largeur < 400 || hauteur < 400) throw new Error(`image trop petite (${largeur}x${hauteur})`);

    fiches.push({
      ...c,
      fiche: { nom: r.nom, prix: r.prix, description, sourceDescription, image: r.image,
               fichier, purete: +purete.toFixed(3), largeur, hauteur },
    });
  } catch (e) {
    rejets.push({ ...c, motif: e.message });
  }
  if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${cibles.length} — ${fiches.length} retenues, ${rejets.length} ecartees`);
  await pause(250);
}

fs.writeFileSync(path.join(DOSSIER, "fiches2.json"), JSON.stringify(fiches, null, 1));
fs.writeFileSync(path.join(DOSSIER, "rejets2.json"), JSON.stringify(rejets, null, 1));
console.log(`\n${fiches.length} fiches completes, ${rejets.length} ecartees`);
for (const r of rejets) console.log(`   ${r.nom.slice(0, 44).padEnd(44)} ${r.motif}`);
