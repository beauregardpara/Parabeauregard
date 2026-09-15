/**
 * Intègre les images générées par IA (PNG) dans le site.
 *
 * Usage :
 *   1. Enregistrez vos images générées dans public/products/ et/ou public/categories/
 *      avec le MÊME nom de base que les fichiers .svg existants (ex: cream-jar.png).
 *   2. Lancez : npm run images:swap
 *
 * Le script met à jour la base de données (ProductImage.url / Category.imageUrl)
 * pour pointer vers le .png dès qu'il existe.
 */
import { PrismaClient } from "@prisma/client";
import { readdirSync } from "node:fs";
import { join, basename } from "node:path";

const prisma = new PrismaClient();

function pngBases(dir) {
  try {
    const files = readdirSync(join(process.cwd(), "public", dir))
      .filter((f) => f.toLowerCase().endsWith(".png"))
      .map((f) => basename(f, ".png"));
    return new Set(files);
  } catch {
    return new Set();
  }
}

async function swapProductImages() {
  const bases = pngBases("products");
  if (bases.size === 0) return console.log("ℹ️  Aucun .png dans public/products — ignoré.");
  let n = 0;
  for (const img of await prisma.productImage.findMany()) {
    if (!img.url?.endsWith(".svg")) continue;
    if (!bases.has(basename(img.url, ".svg"))) continue;
    await prisma.productImage.update({ where: { id: img.id }, data: { url: img.url.replace(/\.svg$/, ".png") } });
    n++;
  }
  console.log(`✅ products : ${n} image(s) mise(s) à jour vers .png`);
}

async function swapCategoryImages() {
  const bases = pngBases("categories");
  if (bases.size === 0) return console.log("ℹ️  Aucun .png dans public/categories — ignoré.");
  let n = 0;
  for (const cat of await prisma.category.findMany()) {
    if (!cat.imageUrl?.endsWith(".svg") && !cat.imageUrl?.includes("/categories/")) continue;
    if (!bases.has(basename(cat.imageUrl))) continue;
    await prisma.category.update({ where: { id: cat.id }, data: { imageUrl: cat.imageUrl.replace(/\.(svg|png|jpe?g|webp)$/i, ".png") } });
    n++;
  }
  console.log(`✅ categories : ${n} image(s) mise(s) à jour vers .png`);
}

try {
  await swapProductImages();
  await swapCategoryImages();
  console.log("\n🎨 Terminé ! Rechargez le site pour voir les nouvelles images.");
} finally {
  await prisma.$disconnect();
}
