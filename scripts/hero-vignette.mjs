/**
 * Visuel principal de la page d'accueil.
 *
 * Compose une vitrine a partir des vrais packshots du catalogue : produits
 * detoures de leur fond blanc, alignes sur une meme ligne de pose, sur le creme
 * du site. Les hauteurs dessinent un arc doux, le plus haut au centre.
 *
 * Usage : node scripts/hero-vignette.mjs <dossier-de-travail>
 * Le dossier doit contenir hero-candidats.json (selection) et hero-choix.json
 * (les cinq identifiants, de gauche a droite).
 */
import sharp from "sharp";
import fs from "fs";

const OUT = process.argv[2];
const DEST = "public/images/premium/hero/hero-produits.webp";

// Format proche du cadre affiche (environ 1,23:1), pour ne rien rogner.
const W = 1600, H = 1300;
const SOL = 990;

/**
 * Retire le fond blanc depuis les bords.
 *
 * Deux precautions : le remplissage part d'un seuil strict, sinon il se
 * propage a travers les bords antialiases et mange le corps blanc des flacons ;
 * puis un leger grignotage efface le halo gris laisse par les ombres de studio,
 * qui serait visible une fois le produit pose sur le creme.
 */
async function detourer(buf) {
  const { data, info } = await sharp(buf).flatten({ background: "#ffffff" }).ensureAlpha()
    .raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const vu = new Uint8Array(w * h);
  const pile = [];
  const fond = (i) => data[i] > 250 && data[i + 1] > 250 && data[i + 2] > 250;
  for (let x = 0; x < w; x++) pile.push([x, 0], [x, h - 1]);
  for (let y = 0; y < h; y++) pile.push([0, y], [w - 1, y]);
  while (pile.length) {
    const [x, y] = pile.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const p = y * w + x;
    if (vu[p]) continue;
    const i = p * c;
    if (!fond(i)) continue;
    vu[p] = 1; data[i + 3] = 0;
    pile.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  // Grignotage du pourtour : seuls les pixels tres clairs touchant deja le vide
  // disparaissent, ce qui retire l'ombre residuelle sans entamer le produit.
  for (let passe = 0; passe < 4; passe++) {
    const aVider = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x, i = p * c;
        if (data[i + 3] === 0) continue;
        if (!(data[i] > 226 && data[i + 1] > 226 && data[i + 2] > 226)) continue;
        if (data[(p - 1) * c + 3] === 0 || data[(p + 1) * c + 3] === 0
          || data[(p - w) * c + 3] === 0 || data[(p + w) * c + 3] === 0) aVider.push(i);
      }
    }
    if (!aVider.length) break;
    for (const i of aVider) data[i + 3] = 0;
  }
  return sharp(data, { raw: { width: w, height: h, channels: c } }).trim({ threshold: 8 }).png().toBuffer();
}

async function ombre(largeur) {
  const ow = Math.round(largeur * 1.35);
  const oh = Math.round(Math.max(30, largeur * 0.2));
  return sharp(Buffer.from(
    `<svg width="${ow}" height="${oh}"><ellipse cx="${ow / 2}" cy="${oh / 2}" rx="${ow / 2.4}" ry="${oh / 2.9}" fill="rgba(92,66,34,0.24)"/></svg>`
  )).blur(Math.max(8, oh / 3)).png().toBuffer();
}

const FOND = Buffer.from(`<svg width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.22" y2="1">
      <stop offset="0%" stop-color="#f8f1e6"/><stop offset="52%" stop-color="#f1e7d7"/><stop offset="100%" stop-color="#e5d5bd"/>
    </linearGradient>
    <radialGradient id="l" cx="0.3" cy="0.1" r="0.85">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" fill="url(#l)"/>
  <ellipse cx="${W * 0.5}" cy="${SOL + 28}" rx="${W * 0.47}" ry="50" fill="#d6bd97" opacity="0.30"/>
</svg>`);

// Cinq emplacements, hauteur croissante vers le centre.
const PLACES = [
  { hMax: 460, wMax: 300, cx: Math.round(W * 0.125) },
  { hMax: 560, wMax: 330, cx: Math.round(W * 0.315) },
  { hMax: 670, wMax: 370, cx: Math.round(W * 0.5) },
  { hMax: 560, wMax: 330, cx: Math.round(W * 0.685) },
  { hMax: 460, wMax: 300, cx: Math.round(W * 0.875) },
];

const choix = JSON.parse(fs.readFileSync(`${OUT}/hero-choix.json`, "utf8"));
const cand = JSON.parse(fs.readFileSync(`${OUT}/hero-candidats.json`, "utf8"));
const parId = Object.fromEntries(cand.map((p) => [p.id, p]));

const couches = [];
for (let i = 0; i < PLACES.length; i++) {
  const p = parId[choix[i]];
  if (!p) throw new Error(`produit ${choix[i]} absent de la selection`);
  const pl = PLACES[i];
  const u = p.url.startsWith("http") ? p.url : "http://localhost:3100" + p.url;
  const decoupe = await detourer(Buffer.from(await (await fetch(u)).arrayBuffer()));
  const buf = await sharp(decoupe).resize({ width: pl.wMax, height: pl.hMax, fit: "inside" }).png().toBuffer();
  const m = await sharp(buf).metadata();
  const omb = await ombre(m.width);
  const mo = await sharp(omb).metadata();
  couches.push({ input: omb, left: Math.round(pl.cx - mo.width / 2), top: Math.round(SOL - mo.height * 0.5) });
  couches.push({ input: buf, left: Math.round(pl.cx - m.width / 2), top: SOL - m.height });
}

await sharp(FOND).composite(couches).webp({ quality: 90 }).toFile(DEST);
console.log(`${DEST} — ${choix.map((id) => `#${id} ${parId[id].brand}`).join(", ")}`);
