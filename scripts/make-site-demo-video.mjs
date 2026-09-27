import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";

const root = process.cwd();
const outputDir = path.join(root, "artifacts", "site-demo-video");
const framesDir = path.join(outputDir, "frames");
const baseUrl = "https://parabeauregard-production.up.railway.app";
const scenes = [
  ["01", "Accueil — Para Beauregard", "/"],
  ["02", "Recherche — trouvez vos produits", "/recherche?q=shampooing"],
  ["03", "Catalogue — soins visage", "/categories/soins-visage"],
  ["04", "Fiche produit — détails et prix", "/produits/svr-ampoule-anti-ox-c-30-ml"],
  ["05", "Livraison et paiement à la livraison", "/livraison-retours"],
  ["06", "Administration sécurisée", "/admin/login"],
];

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(framesDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

for (const [number, title, route] of scenes) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(1_200);
  const screenshot = await page.screenshot({ type: "png" });
  const overlay = Buffer.from(`<svg width="1280" height="112"><rect width="1280" height="112" fill="#062f2a" fill-opacity="0.94"/><text x="48" y="48" fill="#ffffff" font-family="Arial" font-size="27" font-weight="700">${title}</text><text x="48" y="83" fill="#b9eee0" font-family="Arial" font-size="17">Para Beauregard · parabeauregard-production.up.railway.app</text></svg>`);
  await sharp(screenshot).composite([{ input: overlay, top: 0, left: 0 }]).png().toFile(path.join(framesDir, `${number}.png`));
}
await browser.close();

const output = path.join(outputDir, "para-beauregard-demo.mp4");
const result = spawnSync(ffmpegPath, [
  "-y", "-hide_banner", "-loglevel", "error",
  "-framerate", "1/6", "-i", path.join(framesDir, "%02d.png"),
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output,
], { stdio: "inherit" });
if (result.status !== 0) throw new Error(`ffmpeg a échoué (${result.status})`);
console.log(output);
