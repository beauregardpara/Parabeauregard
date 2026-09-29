/**
 * Cree en base les produits preparés par enrichir-fiches.mjs.
 *
 * Le script est strictement additif : il ne modifie et ne supprime aucun
 * produit existant. Une reference dont le slug est deja pris est ignoree, pas
 * ecrasee — le catalogue en ligne fait foi.
 *
 * Usage :
 *   tsx scripts/importer-fiches.ts <dossier>            (simulation)
 *   tsx scripts/importer-fiches.ts <dossier> --ecrire   (ecriture reelle)
 */
import { config as chargerEnv } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
import { formatProductName, productSlugSource, buildSearchText, foldForSearch } from "../src/lib/product-name";
import { slugify } from "../src/lib/format";
import { randomUUID } from "node:crypto";

type Fiche = {
  marque: string;
  gamme: string;
  nom: string;
  format: string;
  prixMin: number | null;
  prixMax: number | null;
  ligne: number;
  revendeur: { nom: string; url: string; boutique?: string };
  fiche: { nom: string; prix: number; description: string; fichier: string };
};

/**
 * Envoi d'une image vers le stockage produit.
 *
 * Le module de l'application importe « server-only » et ne peut donc pas etre
 * charge hors de Next ; l'appel est reproduit ici a l'identique.
 */
async function envoyerImage(productId: number, webp: Buffer) {
  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || "product-images";
  if (!url || !cle) return { ok: false as const, error: "stockage non configure" };

  const chemin = `products/${productId}/${randomUUID()}.webp`;
  const reponse = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${chemin}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cle}`,
      apikey: cle,
      "Content-Type": "image/webp",
      "x-upsert": "false",
    },
    body: new Uint8Array(webp),
  });
  if (!reponse.ok) return { ok: false as const, error: `stockage ${reponse.status}` };
  return {
    ok: true as const,
    url: `${url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${chemin}`,
  };
}

// `.env.local` porte la configuration de production et prime sur `.env`,
// comme pour le serveur Next. `override` est indispensable : le client Prisma
// lit `.env` des son import, donc avant cette ligne, et figerait la base locale.
chargerEnv({ path: ".env.local", override: true });
chargerEnv({ path: ".env" });

const dossier = process.argv[2];
// Le nom du fichier est un parametre : un second lot, issu d'autres
// revendeurs, se prepare dans le meme dossier.
const nomFichier = process.argv.find((a) => a.startsWith("--fiches="))?.split("=")[1] ?? "fiches.json";
const ecrire = process.argv.includes("--ecrire");

/** Decrit la base visee sans jamais divulguer d'identifiants. */
function baseVisee(): { libelle: string; distante: boolean } {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("file:")) return { libelle: `SQLite locale (${url})`, distante: false };
  const hote = url.replace(/^\w+:\/\/[^@]*@/, "").split("/")[0].split("?")[0];
  return { libelle: `PostgreSQL distante (${hote})`, distante: true };
}

const cible = baseVisee();
// Ecrire dans la boutique en ligne doit etre demande, jamais deduit du .env.
if (ecrire && cible.distante && !process.argv.includes("--production")) {
  console.error(`Refus : ${cible.libelle}. Ajouter --production pour ecrire dans la boutique en ligne.`);
  process.exit(1);
}
if (!dossier) {
  console.error("usage: tsx scripts/importer-fiches.ts <dossier> [--ecrire]");
  process.exit(1);
}

/**
 * Rangement par rayon. Les regles sont ordonnees : la premiere qui reconnait
 * le produit gagne, du plus specifique au plus general.
 */
const RAYONS: [RegExp, string][] = [
  [/\bspf|solaire|photoderm|anthelios|ecran\b/i, "protection-solaire"],
  [/dentifrice|bain de bouche|brosse a dents?|brossette|interdental|fil dentaire|gencive|aphte|afta|ortho/i, "bucco-dentaire"],
  [/deodorant|anti[- ]?transpirant|detranspirant/i, "deodorants"],
  [/rasage|rasoir|apres[- ]rasage|barbe|epilation|depilatoire/i, "rasage-epilation"],
  [/hygiene intime|soin lavant.*intime|gel intime/i, "hygiene-intime"],
  [/shampoing|shampooing/i, "shampoings"],
  [/anti[- ]?chute|anticaduta/i, "anti-chute"],
  [/cheveux|capillaire|coloration|keratine/i, "soins-cheveux"],
  [/bebe|abcderm|change|liniment|nourrisson/i, "bebe-maman"],
  // Du plus precis au plus general : « Vitamine D3 60 capsules » appartient
  // aux vitamines, pas au rayon generique des complements.
  [/minceur|drainant|brule/i, "minceur"],
  [/vitamine|magnesium|zinc|omega|collagene|spiruline|probiotique/i, "vitamines"],
  [/gelule|comprime|capsule|ampoule buvable|complement/i, "complements-alimentaires"],
  [/eau micellaire|demaquillant|nettoyant|gel moussant|lotion nettoyante|mousse/i, "nettoyants-demaquillants"],
  [/anti[- ]?age|rides?|fermete|anti[- ]?taches?|pigment|eclat|blanchissant/i, "anti-age"],
  [/douche|bain|gel lavant|huile lavante|corps|mains|pieds|deodorant|savon|hygiene/i, "hygiene-corps"],
  [/creme|baume|hydratant|emollient|lait/i, "cremes-hydratantes"],
];

function rayonDe(nom: string): string {
  // Le libelle est replie avant d'etre teste : « Brosse a Dent » accentue
  // echappait a la regle et finissait au rayon visage.
  const replie = foldForSearch(nom);
  for (const [regle, slug] of RAYONS) if (regle.test(replie)) return slug;
  return "soins-visage";
}

/**
 * Assainit un texte venu d'un revendeur.
 *
 * Les descriptions sont converties depuis du HTML : il y subsiste des
 * caracteres de controle et des antislashs isoles. Un seul d'entre eux, dans
 * une fiche Eucerin, a fait echouer l'ecriture de tout un lot.
 */
function nettoyerTexte(t: string): string {
  return t
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[\uD800-\uDFFF]/g, "")
    .split(String.fromCharCode(92)).join(" ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Coupe la description a une longueur lisible, sur une fin de phrase. */
function resume(description: string, max = 180): string {
  if (description.length <= max) return description;
  const coupe = description.slice(0, max);
  const point = coupe.lastIndexOf(". ");
  return (point > 80 ? coupe.slice(0, point + 1) : `${coupe.trimEnd()}…`).trim();
}

/** Pictogrammes decoratifs ajoutes par les revendeurs aux libelles. */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2190}-\u{27BF}\u{FE0F}]/gu;

const db = new PrismaClient();

async function main() {
  const fiches: Fiche[] = JSON.parse(fs.readFileSync(path.join(dossier, nomFichier), "utf8"));
  console.log(`${fiches.length} fiches a traiter — ${ecrire ? "ECRITURE REELLE" : "simulation"}\n`);
  console.log(`base : ${cible.libelle}
`);

  const categories = await db.category.findMany({ select: { id: true, slug: true } });
  const parSlug = new Map(categories.map((c) => [c.slug, c.id]));

  let crees = 0;
  const ignores: string[] = [];

  for (const f of fiches) {
    const marque = f.marque;
    // Les revendeurs ajoutent parfois un pictogramme promotionnel au libelle,
    // et n'ecrivent pas toujours la marque en tete alors que tout le catalogue
    // le fait.
    const libelle = nettoyerTexte(f.fiche.nom.replace(EMOJI, "")).replace(/\s+/g, " ");
    const nom = productSlugSource(formatProductName(libelle, marque), marque);
    const slug = slugify(nom);

    const existant = await db.product.findUnique({ where: { slug }, select: { id: true } });
    if (existant) { ignores.push(`${slug} (deja au catalogue)`); continue; }

    const rayon = rayonDe(`${nom} ${f.gamme}`);
    const categoryId = parSlug.get(rayon) ?? null;

    // Le prix vient de la fiche du revendeur, jamais d'une moyenne calculee sur
    // la fourchette du fichier : on ne publie que des montants reellement
    // pratiques. La fourchette ne sert qu'a detecter une aberration.
    const description = nettoyerTexte(f.fiche.description);
    const prix = f.fiche.prix;
    if (f.prixMin != null && f.prixMax != null && (prix < f.prixMin * 0.5 || prix > f.prixMax * 2)) {
      ignores.push(`${slug} (prix ${prix} DH hors fourchette ${f.prixMin}-${f.prixMax})`);
      continue;
    }

    if (!ecrire) {
      console.log(`  + ${nom}`);
      console.log(`      ${marque} | ${rayon} | ${prix} DH | ${description.length} car.`);
      crees++;
      continue;
    }

    const produit = await db.product.create({
      data: {
        name: nom,
        slug,
        brand: marque,
        shortDescription: resume(description),
        description,
        price: prix,
        status: "PUBLISHED",
        unlimitedStock: true,
        categoryId,
        searchText: buildSearchText([nom, marque, description.slice(0, 400)]),
        sourceName: f.revendeur.boutique ?? "universparadiscount.ma",
        sourceUrl: f.revendeur.url,
        sourceId: `${(f.revendeur.boutique ?? "upd").split(".")[0]}-${f.ligne}`,
        lastScrapedAt: new Date(),
        lastSeenAt: new Date(),
      },
      select: { id: true },
    });

    const webp = await sharp(f.fiche.fichier).resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86 }).toBuffer();
    const envoi = await envoyerImage(produit.id, webp);
    if (!envoi.ok) {
      // Un produit sans visuel n'a rien a faire en boutique : on le retire.
      await db.product.delete({ where: { id: produit.id } });
      ignores.push(`${slug} (envoi de l'image refuse : ${envoi.error})`);
      continue;
    }
    await db.productImage.create({ data: { productId: produit.id, url: envoi.url, order: 0 } });

    crees++;
    if (crees % 20 === 0) console.log(`  ${crees} produits crees…`);
  }

  console.log(`\n${crees} produits ${ecrire ? "crees" : "a creer"}, ${ignores.length} ignores`);
  for (const i of ignores) console.log(`  - ${i}`);
  await db.$disconnect();
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
