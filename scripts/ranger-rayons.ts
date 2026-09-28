/**
 * Applique un plan de rangement par rayon.
 *
 * Le script ne touche qu'au rayon : aucun libelle, prix, photo ni statut n'est
 * modifie. L'etat actuel de chaque produit concerne est sauvegarde avant la
 * premiere ecriture, pour pouvoir revenir en arriere.
 *
 * Usage :
 *   tsx scripts/ranger-rayons.ts <plan.json>                        (simulation)
 *   tsx scripts/ranger-rayons.ts <plan.json> --ecrire --production  (ecriture)
 */
import { config as chargerEnv } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

chargerEnv({ path: ".env.local", override: true });
chargerEnv({ path: ".env" });

type Mouvement = { id: number; name: string; de: string | null; vers: string; categoryId: number; motif: string };

const fichier = process.argv[2];
const ecrire = process.argv.includes("--ecrire");
if (!fichier) { console.error("usage: tsx scripts/ranger-rayons.ts <plan.json> [--ecrire --production]"); process.exit(1); }

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
  console.log(`${plan.length} deplacements — ${ecrire ? "ECRITURE REELLE" : "simulation"}`);
  console.log(`base : ${cible.libelle}\n`);

  const avant = await db.product.findMany({
    where: { id: { in: plan.map((m) => m.id) } },
    select: { id: true, name: true, categoryId: true },
  });
  if (avant.length !== plan.length) {
    console.log(`${plan.length - avant.length} produits du plan sont introuvables en base.`);
  }

  if (ecrire) {
    // Sauvegarde avant la premiere ecriture : sans elle, un rangement errone
    // serait irreversible.
    const sauvegarde = path.join(path.dirname(fichier), `rayons-avant-${Date.now()}.json`);
    fs.writeFileSync(sauvegarde, JSON.stringify(avant, null, 1));
    console.log(`etat precedent sauvegarde dans ${sauvegarde}\n`);
  }

  const parId = new Map(avant.map((p) => [p.id, p]));
  let deplaces = 0, ignores = 0;

  for (const m of plan) {
    const actuel = parId.get(m.id);
    if (!actuel) { ignores++; continue; }
    // Le rayon a pu changer depuis la preparation du plan : on ne recouvre pas
    // une decision plus recente que la notre.
    if (actuel.categoryId !== null && m.de === null) { ignores++; continue; }
    if (!ecrire) { deplaces++; continue; }
    await db.product.update({ where: { id: m.id }, data: { categoryId: m.categoryId } });
    deplaces++;
    if (deplaces % 40 === 0) console.log(`  ${deplaces} produits ranges…`);
  }

  console.log(`\n${deplaces} produits ${ecrire ? "ranges" : "a ranger"}, ${ignores} ignores`);
  await db.$disconnect();
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
