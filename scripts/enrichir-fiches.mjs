/**
 * Complete chaque correspondance par les donnees de la fiche du revendeur :
 * prix exact, description, photo en grand format.
 *
 * La page produit est la seule source fiable du prix : la grille de categorie
 * affiche parfois un prix barre ou un prix « a partir de ». La photo est
 * telechargee et controlee ici, pour qu'aucune fiche sans visuel exploitable
 * n'arrive en base.
 */
import * as cheerio from "cheerio";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const DOSSIER = process.argv[2];
if (!DOSSIER) { console.error("usage: node scripts/enrichir-fiches.mjs <dossier>"); process.exit(1); }
const IMAGES = path.join(DOSSIER, "images");
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

const cibles = JSON.parse(fs.readFileSync(path.join(DOSSIER, "trouves.json"), "utf8"));
const fiches = [], rejets = [];

for (const [i, c] of cibles.entries()) {
  const url = c.revendeur.url;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(45000) });
    if (!res.ok) throw new Error(`page ${res.status}`);
    const $ = cheerio.load(await res.text());

    const nom = $("h1").first().text().trim().replace(/\s+/g, " ");
    // `product:price:amount` porte le prix reellement pratique ; lire le premier
    // montant de la page attrapait le prix d'un produit suggere.
    const prix = parseFloat($("meta[property='product:price:amount']").attr("content") ?? "");
    const description = $("#description, .product-description, [itemprop=description]").first()
      .text().trim().replace(/\s+/g, " ");
    const image = $("meta[property='og:image']").attr("content");

    if (!nom || !Number.isFinite(prix) || prix <= 0) throw new Error("nom ou prix absent");
    if (!image) throw new Error("aucune image");
    if (description.length < 120) throw new Error(`description trop courte (${description.length})`);

    const fichier = path.join(IMAGES, `${c.ligne}.jpg`);
    const img = await fetch(image, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(45000) });
    if (!img.ok) throw new Error(`image ${img.status}`);
    fs.writeFileSync(fichier, Buffer.from(await img.arrayBuffer()));

    const { purete, largeur, hauteur } = await fondBlanc(fichier);
    if (largeur < 400 || hauteur < 400) throw new Error(`image trop petite (${largeur}x${hauteur})`);

    fiches.push({ ...c, fiche: { nom, prix, description, image, fichier, purete: +purete.toFixed(3), largeur, hauteur } });
  } catch (e) {
    rejets.push({ ...c, motif: e.message });
  }
  if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${cibles.length} — ${fiches.length} retenues, ${rejets.length} ecartees`);
  await pause(700 + Math.random() * 700);
}

fs.writeFileSync(path.join(DOSSIER, "fiches.json"), JSON.stringify(fiches, null, 1));
fs.writeFileSync(path.join(DOSSIER, "rejets.json"), JSON.stringify(rejets, null, 1));
console.log(`\n${fiches.length} fiches completes, ${rejets.length} ecartees`);
