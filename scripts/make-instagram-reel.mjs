import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";

const root = process.cwd();
const outDir = path.join(root, "artifacts", "instagram-reel");
const rawDir = path.join(outDir, "mobile-scenes");
const baseUrl = "https://parabeauregard-production.up.railway.app";
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(rawDir, { recursive: true });

const scenes = [
  { id: "01", route: "/", duration: 3, title: "Votre parapharmacie maintenant en ligne ✨", kicker: "PARA BEAUREGARD" },
  { id: "02", route: "/", duration: 4, scroll: 520, title: "Découvrez Para Beauregard", kicker: "BEAUTÉ · SANTÉ · BIEN-ÊTRE" },
  { id: "03", route: "/recherche?q=shampooing", duration: 4, title: "Vos soins & marques préférés", kicker: "UNE SÉLECTION POUR VOUS" },
  { id: "04", route: "/categories/soins-visage", duration: 4, title: "Trouvez facilement vos produits", kicker: "CATÉGORIES · RECHERCHE · CONSEILS" },
  { id: "05", route: "/produits/svr-ampoule-anti-ox-c-30-ml", duration: 4, title: "Choisissez votre produit", kicker: "DÉTAILS · PRIX · DISPONIBILITÉ" },
  { id: "06", route: "/produits/svr-ampoule-anti-ox-c-30-ml", duration: 4, title: "Commandez simplement", kicker: "AJOUTEZ AU PANIER EN QUELQUES CLICS" },
  { id: "07", route: "/", duration: 5, title: "Découvrez notre boutique", kicker: "LIVRAISON AU MAROC 🇲🇦" },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true });
for (const scene of scenes) {
  await page.goto(`${baseUrl}${scene.route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(900);
  if (scene.scroll) await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), scene.scroll);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(rawDir, `${scene.id}.png`), type: "png" });
}
await browser.close();

const W = 1080, H = 1920, screenW = 820, screenH = 1455, screenX = 130, screenY = 205;
const esc = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
const wrap = (text, max = 31) => {
  const words = text.split(" "); const lines = []; let line = "";
  for (const word of words) { if ((line + " " + word).trim().length > max && line) { lines.push(line); line = word; } else line = (line + " " + word).trim(); }
  if (line) lines.push(line); return lines;
};

for (const scene of scenes) {
  const input = path.join(rawDir, `${scene.id}.png`);
  const bg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f5efe8"/><stop offset="1" stop-color="#dfeee8"/></linearGradient>
    <filter id="shadow" x="-30%" y="-20%" width="160%" height="150%"><feGaussianBlur stdDeviation="25"/><feColorMatrix values="0 0 0 0 0.02 0 0 0 0 0.15 0 0 0 0 0.13 0 0 0 .28 0"/></filter></defs>
    <rect width="1080" height="1920" fill="url(#g)"/><circle cx="890" cy="310" r="280" fill="#ffffff" opacity=".25"/><circle cx="120" cy="1660" r="310" fill="#bde1d6" opacity=".25"/>
    <rect x="105" y="180" width="870" height="1510" rx="74" fill="#0b1717" opacity=".38" filter="url(#shadow)"/><rect x="108" y="170" width="864" height="1515" rx="70" fill="#101717"/>
    <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${screenH}" rx="48" fill="#fffaf5"/>
    <rect x="465" y="188" width="150" height="34" rx="17" fill="#101717"/>
    <circle cx="870" cy="205" r="8" fill="#b6e2d7"/><text x="90" y="90" fill="#0b4038" font-family="Arial" font-size="24" font-weight="700" letter-spacing="5">PARA BEAUREGARD</text>
    <text x="990" y="90" text-anchor="end" fill="#54716a" font-family="Arial" font-size="22">${scene.id}/07</text></svg>`);
  // La source est une capture desktop 16:9 : on la conserve entière pour que
  // les produits et les prix restent lisibles dans le téléphone.
  const resized = await sharp(input).resize(screenW - 34, screenH - 34, { fit: "contain", background: "#f7f2ec" }).png().toBuffer();
  const lines = wrap(scene.title);
  const titleSvg = Buffer.from(`<svg width="1000" height="185" xmlns="http://www.w3.org/2000/svg"><text x="50" y="38" fill="#0b4038" font-family="Arial" font-size="19" font-weight="700" letter-spacing="4">${esc(scene.kicker)}</text>${lines.map((line, i) => `<text x="50" y="${87 + i * 45}" fill="#0b302b" font-family="Arial" font-size="39" font-weight="700">${esc(line)}</text>`).join("")}</svg>`);
  const isFinal = scene.id === "07";
  const ctaSvg = Buffer.from(`<svg width="1000" height="220" xmlns="http://www.w3.org/2000/svg"><rect x="50" y="18" width="430" height="70" rx="35" fill="#0b4038"/><text x="265" y="63" text-anchor="middle" fill="white" font-family="Arial" font-size="26" font-weight="700">${isFinal ? "VISITEZ LA BOUTIQUE" : "PARA BEAUREGARD  ·  MAROC"}</text><text x="50" y="145" fill="#3b5f56" font-family="Arial" font-size="25">${isFinal ? "Votre parapharmacie en ligne" : "Soins, beauté et bien-être"}</text></svg>`);
  await sharp(bg).composite([
    { input: resized, left: screenX + 17, top: screenY + 17 },
    { input: titleSvg, left: 40, top: 1750 },
    { input: ctaSvg, left: 40, top: 15 },
  ]).png().toFile(path.join(outDir, `${scene.id}.png`));
}

const concatPath = path.join(outDir, "concat.txt");
await fs.writeFile(concatPath, scenes.map((s) => `file '${path.join(outDir, `${s.id}.png`).replaceAll("'", "'\\''")}'\nduration ${s.duration}`).join("\n") + `\nfile '${path.join(outDir, "07.png")}'`);
const silentMp4 = path.join(outDir, "reel-video.mp4");
let result = spawnSync(ffmpegPath, ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concatPath, "-r", "30", "-t", "28", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", silentMp4], { stdio: "inherit" });
if (result.status !== 0) throw new Error(`Encodage vidéo échoué (${result.status})`);

// Courte nappe instrumentale originale, très discrète sous les textes.
const musicWav = path.join(outDir, "ambient.wav");
const rate = 44100, seconds = 28, samples = rate * seconds, data = Buffer.alloc(samples * 2 * 2);
const notes = [220, 277.18, 329.63, 440];
for (let i = 0; i < samples; i++) {
  const t = i / rate, fade = Math.min(1, t / 1.8, (seconds - t) / 2);
  let value = 0;
  for (const [idx, freq] of notes.entries()) value += Math.sin(2 * Math.PI * freq * t + idx) * (idx === 0 ? 0.045 : 0.018);
  const sample = Math.max(-1, Math.min(1, value * Math.max(0, fade)));
  data.writeInt16LE(Math.round(sample * 32767), i * 4); data.writeInt16LE(Math.round(sample * 32767), i * 4 + 2);
}
const wav = Buffer.alloc(44 + data.length); wav.write("RIFF", 0); wav.writeUInt32LE(36 + data.length, 4); wav.write("WAVE", 8); wav.write("fmt ", 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(data.length, 40); data.copy(wav, 44); await fs.writeFile(musicWav, wav);
const finalMp4 = path.join(outDir, "para-beauregard-instagram-reel.mp4");
result = spawnSync(ffmpegPath, ["-y", "-hide_banner", "-loglevel", "error", "-i", silentMp4, "-i", musicWav, "-t", "28", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", finalMp4], { stdio: "inherit" });
if (result.status !== 0) throw new Error(`Mixage audio échoué (${result.status})`);
console.log(finalMp4);
