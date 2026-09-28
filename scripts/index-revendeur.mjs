/**
 * Construit un index du catalogue d'un revendeur marocain.
 *
 * Chercher chaque produit un par un demanderait autant de requetes que de
 * references ; parcourir une fois les pages de categorie coute bien moins cher
 * au site et donne deja le nom, le prix, l'image et l'adresse de chaque fiche.
 * Sortie : <dossier>/index-revendeur.json
 */
import * as cheerio from "cheerio";
import fs from "node:fs";
import path from "node:path";

const OUT = process.argv[2];
const CATEGORIES = fs.readFileSync(process.argv[3], "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
if (!OUT) { console.error("usage: node scripts/index-revendeur.mjs <dossier> <fichier-categories>"); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

const UA = "Mozilla/5.0 (compatible; ParaBeauregardBot/1.0; +https://parabeauregard.ma)";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function page(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(45000) });
  if (!res.ok) throw new Error(`${res.status}`);
  return cheerio.load(await res.text());
}

const fiches = new Map();
for (const base of CATEGORIES) {
  for (let p = 1; p <= 20; p++) {
    // `from-xhr` est ce qui fait reellement changer de page sur cette
    // boutique : sans lui, `page=2` renvoie la premiere page a l'identique.
    const url = `${base}?resultsPerPage=200&from-xhr=&page=${p}`;
    let $;
    try { $ = await page(url); } catch (e) { console.log(`  ${url} -> ${e.message}`); break; }
    const cartes = $(".js-product-miniature");
    if (cartes.length === 0) break;
    let ajouts = 0;
    cartes.each((_, el) => {
      const c = $(el);
      const lien = c.find(".product_name a").first();
      const href = lien.attr("href");
      const nom = lien.text().trim().replace(/\s+/g, " ");
      if (!href || !nom || fiches.has(href)) return;
      const img = c.find("img").first();
      fiches.set(href, {
        nom,
        url: href,
        prixBrut: c.find(".price").first().text().trim(),
        image: img.attr("data-src") || img.attr("src") || null,
      });
      ajouts++;
    });
    console.log(`${base.split("/").pop()} p${p} : ${cartes.length} fiches (${ajouts} nouvelles)`);
    if (cartes.length < 200) break;
    await pause(900 + Math.random() * 900);
  }
  await pause(700);
}

const liste = [...fiches.values()];
fs.writeFileSync(path.join(OUT, "index-revendeur.json"), JSON.stringify(liste, null, 1));
console.log(`\n${liste.length} fiches indexees`);
