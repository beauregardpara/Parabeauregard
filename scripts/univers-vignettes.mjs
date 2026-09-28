/**
 * Vignettes des univers de la page d'accueil.
 *
 * Elles sont composees a partir des vrais packshots du catalogue : produits
 * detoures de leur fond blanc, poses sur le creme du site. Relancer ce script
 * apres un changement de selection ; il ecrit dans public/images/premium/univers.
 */
import sharp from "sharp"; import fs from "fs"; import path from "path";
const OUT = process.argv[2];
const DEST = "public/images/premium/univers";
const sel = JSON.parse(fs.readFileSync(OUT + "/univers-retenus.json", "utf8"));

const W = 1200, H = 900, SOL = 796;

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
  const ow = Math.round(largeur * 1.05), oh = Math.round(Math.max(24, largeur * 0.15));
  return sharp(Buffer.from(
    `<svg width="${ow}" height="${oh}"><ellipse cx="${ow/2}" cy="${oh/2}" rx="${ow/2.7}" ry="${oh/2.9}" fill="rgba(92,66,34,0.26)"/></svg>`
  )).blur(Math.max(5, oh / 4)).png().toBuffer();
}

const FOND = Buffer.from(`<svg width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#f9f3ea"/><stop offset="55%" stop-color="#f2e9da"/><stop offset="100%" stop-color="#e8dac5"/>
    </linearGradient>
    <radialGradient id="l" cx="0.34" cy="0.16" r="0.72">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" fill="url(#l)"/>
  <ellipse cx="${W/2}" cy="${SOL + 18}" rx="${W*0.43}" ry="32" fill="#dcc9ad" opacity="0.30"/>
</svg>`);

// Le cadrage rond rogne les bords : les flacons lateraux restent etroits et
// rentres, et on prefere des silhouettes hautes, qu'un cercle ne tranche pas.
const PLACES = [
  { hMax: 510, wMax: Math.round(W * 0.26), cx: Math.round(W * 0.205) },
  { hMax: 630, wMax: Math.round(W * 0.32), cx: Math.round(W * 0.5) },
  { hMax: 510, wMax: Math.round(W * 0.26), cx: Math.round(W * 0.795) },
];

for (const [slug, v] of Object.entries(sel)) {
  if (v.retenus.length < 3) { console.log(`${slug} : ignore (moins de 3 produits)`); continue; }
  const ordre = [v.retenus[1], v.retenus[0], v.retenus[2]];
  const couches = [];
  for (let i = 0; i < 3; i++) {
    const p = ordre[i], pl = PLACES[i];
    // Les chemins relatifs sont servis depuis public/ : les lire sur le disque
    // evite d'avoir a demarrer le serveur de developpement pour composer les
    // vignettes.
    const source = p.url.startsWith("http")
      ? Buffer.from(await (await fetch(p.url)).arrayBuffer())
      : fs.readFileSync(path.join("public", p.url));
    const decoupe = await detourer(source);
    const redim = await sharp(decoupe)
      .resize({ width: pl.wMax, height: pl.hMax, fit: "inside", withoutEnlargement: false })
      .png().toBuffer();
    const m = await sharp(redim).metadata();
    const omb = await ombre(m.width); const mo = await sharp(omb).metadata();
    couches.push({ input: omb, left: Math.round(pl.cx - mo.width / 2), top: Math.round(SOL - mo.height * 0.45) });
    couches.push({ input: redim, left: Math.round(pl.cx - m.width / 2), top: SOL - m.height });
  }
  const fichier = path.join(DEST, `${slug}-produits.webp`);
  await sharp(FOND).composite(couches).webp({ quality: 88 }).toFile(fichier);
  console.log(`${slug} -> ${ordre.map(p => "#" + p.id + " " + p.brand).join(", ")}`);
}
