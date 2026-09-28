/**
 * Fait evoluer l'arborescence des rayons : cree des sous-rayons, rend visibles
 * ceux qui etaient masques, puis applique un plan de deplacement.
 *
 * Le script n'ecrit que sur les rayons et sur le rattachement des produits :
 * aucun libelle, prix, photo ni statut de produit n'est modifie. Tout ce qu'il
 * s'apprete a changer est sauvegarde avant la premiere ecriture.
 *
 * Usage :
 *   tsx scripts/rayons-structure.ts <plan.json>                        (simulation)
 *   tsx scripts/rayons-structure.ts <plan.json> --ecrire --production  (ecriture)
 */
import { config as chargerEnv } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

chargerEnv({ path: ".env.local", override: true });
chargerEnv({ path: ".env" });

type Mouvement = { id: number; name: string; de: string | null; vers: string; motif: string };

/** Sous-rayons a creer sous « hygiene corps », dans l'ordre d'affichage. */
const A_CREER = [
  { slug: "bucco-dentaire", name: "Bucco-dentaire", icon: "🦷" },
  { slug: "deodorants", name: "Déodorants", icon: "💨" },
  { slug: "rasage-epilation", name: "Rasage & épilation", icon: "🪒" },
  { slug: "hygiene-intime", name: "Hygiène intime", icon: "🌸" },
] as const;

const PARENT_HYGIENE = "hygiene-corps";

/**
 * Rayons masques alors qu'ils sont peuples : ils n'apparaissaient ni au menu ni
 * au pied de page, et leurs produits n'etaient atteignables que par la
 * recherche.
 */
const A_RENDRE_VISIBLES = [
  "protection-solaire",
  "complements-alimentaires",
  "vitamines",
  "shampoings",
  "alimentation-bebe",
  "anti-chute",
];

const fichier = process.argv[2];
const ecrire = process.argv.includes("--ecrire");
if (!fichier) {
  console.error("usage: tsx scripts/rayons-structure.ts <plan.json> [--ecrire --production]");
  process.exit(1);
}

function baseVisee() {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("file:")) return { libelle: `SQLite locale (${url})`, distante: false };
  const hote = url.replace(/^\w+:\/\/[^@]*@/, "").split("/")[0].split("?")[0];
  return { libelle: `PostgreSQL distante (${hote})`, distante: true };
}

const cible = baseVisee();
if (ecrire && cible.distante && !process.argv.includes("--production")) {
  console.error(`Refus : ${cible.libelle}. Ajouter --production pour ecrire dans la boutique en ligne.`);
  process.exit(1);
}

const db = new PrismaClient();

async function main() {
  const plan: Mouvement[] = JSON.parse(fs.readFileSync(fichier, "utf8"));
  console.log(`${ecrire ? "ECRITURE REELLE" : "simulation"} — base : ${cible.libelle}\n`);

  const rayons = await db.category.findMany({
    select: { id: true, slug: true, name: true, visible: true, parentId: true, order: true },
  });
  const parSlug = new Map(rayons.map((c) => [c.slug, c]));
  const parent = parSlug.get(PARENT_HYGIENE);
  if (!parent) throw new Error(`rayon parent « ${PARENT_HYGIENE} » introuvable`);

  const produits = await db.product.findMany({
    where: { id: { in: plan.map((m) => m.id) } },
    select: { id: true, name: true, categoryId: true },
  });

  if (ecrire) {
    // Sauvegarde avant la premiere ecriture : rayons touches et rattachement
    // actuel de chaque produit deplace.
    const sauvegarde = path.join(path.dirname(fichier), `structure-avant-${Date.now()}.json`);
    fs.writeFileSync(sauvegarde, JSON.stringify({ rayons, produits }, null, 1));
    console.log(`etat precedent sauvegarde dans ${sauvegarde}\n`);
  }

  // 1. Creation des sous-rayons manquants.
  console.log("Sous-rayons :");
  for (const [i, c] of A_CREER.entries()) {
    const existant = parSlug.get(c.slug);
    if (existant) { console.log(`  = ${c.slug} existe deja`); continue; }
    if (!ecrire) {
      console.log(`  + ${c.slug} « ${c.name} » sous ${PARENT_HYGIENE}`);
      // Rayon fictif, pour que la simulation compte les deplacements qui le
      // visent au lieu de les declarer ignores.
      parSlug.set(c.slug, { id: -1 - i, slug: c.slug, name: c.name, visible: true, parentId: parent.id, order: i });
      continue;
    }
    const cree = await db.category.create({
      data: { slug: c.slug, name: c.name, icon: c.icon, parentId: parent.id, order: i, visible: true },
      select: { id: true, slug: true, name: true, visible: true, parentId: true, order: true },
    });
    parSlug.set(cree.slug, cree);
    console.log(`  + ${c.slug} cree (#${cree.id})`);
  }

  // 2. Rayons peuples mais masques.
  console.log("\nVisibilite :");
  for (const slug of A_RENDRE_VISIBLES) {
    const r = parSlug.get(slug);
    if (!r) { console.log(`  ? ${slug} introuvable`); continue; }
    if (r.visible) { console.log(`  = ${slug} deja visible`); continue; }
    if (!ecrire) { console.log(`  ↑ ${slug} passerait de masque a visible`); continue; }
    await db.category.update({ where: { id: r.id }, data: { visible: true } });
    console.log(`  ↑ ${slug} rendu visible`);
  }

  // 3. Deplacements.
  const parId = new Map(produits.map((p) => [p.id, p]));
  let deplaces = 0, ignores = 0;
  for (const m of plan) {
    const produit = parId.get(m.id);
    const destination = parSlug.get(m.vers);
    if (!produit || !destination) { ignores++; continue; }
    if (destination.id === produit.categoryId) { ignores++; continue; }
    if (ecrire) await db.product.update({ where: { id: m.id }, data: { categoryId: destination.id } });
    deplaces++;
  }
  console.log(`\n${deplaces} produits ${ecrire ? "ranges" : "a ranger"}, ${ignores} ignores`);

  await db.$disconnect();
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
