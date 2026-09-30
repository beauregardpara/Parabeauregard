/**
 * Index du catalogue d'un ou plusieurs revendeurs marocains sous Shopify.
 *
 * Ces boutiques exposent leur catalogue en JSON : un seul appel donne le
 * libelle, la marque, le prix, la photo et la description. C'est plus propre
 * et bien moins lourd pour leurs serveurs que de parcourir les pages HTML puis
 * d'ouvrir chaque fiche, comme il a fallu le faire pour le premier revendeur.
 *
 * Sortie : <dossier>/index-shopify.json
 */
import fs from "node:fs";
import path from "node:path";

const OUT = process.argv[2];
const BOUTIQUES = process.argv.slice(3);
if (!OUT || BOUTIQUES.length === 0) {
  console.error("usage: node scripts/index-shopify.mjs <dossier> <boutique…>");
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

const UA = "Mozilla/5.0 (compatible; ParaBeauregardBot/1.0; +https://parabeauregard.ma)";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** Retire le balisage de la description fournie par la boutique. */
function texte(html) {
  return (html ?? "")
    .replace(/<\s*(br|\/p|\/li|\/div)\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

const fiches = [];
for (const boutique of BOUTIQUES) {
  let total = 0;
  for (let page = 1; page <= 40; page++) {
    let lot;
    try {
      const res = await fetch(`https://${boutique}/products.json?limit=250&page=${page}`, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) throw new Error(String(res.status));
      lot = (await res.json()).products ?? [];
    } catch (e) {
      console.log(`  ${boutique} p${page} -> ${e.message}`);
      break;
    }
    if (lot.length === 0) break;

    for (const p of lot) {
      const variante = p.variants?.[0];
      const prix = Number.parseFloat(variante?.price ?? "");
      fiches.push({
        boutique,
        nom: (p.title ?? "").replace(/\s+/g, " ").trim(),
        marque: p.vendor ?? null,
        prix: Number.isFinite(prix) ? prix : null,
        disponible: variante?.available ?? null,
        image: p.images?.[0]?.src ?? null,
        description: texte(p.body_html),
        url: `https://${boutique}/products/${p.handle}`,
      });
    }
    total += lot.length;
    console.log(`  ${boutique} p${page} : ${lot.length} fiches`);
    if (lot.length < 250) break;
    await pause(700 + Math.random() * 700);
  }
  console.log(`${boutique} : ${total} fiches\n`);
  await pause(800);
}

fs.writeFileSync(path.join(OUT, "index-shopify.json"), JSON.stringify(fiches, null, 1));
console.log(`${fiches.length} fiches indexees au total`);
