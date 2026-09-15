/**
 * Jeu de données de test — npm run db:seed
 * Crée : catégories, 48 produits réalistes, avis, codes promo, comptes admin & client, commande démo.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createHmac } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  // scrypt comme src/lib/auth.ts
  const { randomBytes, scryptSync } = require("crypto") as typeof import("crypto");
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function sessionToken(payload: object): string {
  const secret = process.env.SESSION_SECRET || "para-beauregard-dev-secret";
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}

const CATEGORIES: { name: string; icon: string; children: { name: string; icon?: string }[] }[] = [
  {
    name: "Soins visage",
    icon: "🧴",
    children: [{ name: "Crèmes hydratantes" }, { name: "Anti-âge" }, { name: "Nettoyants & démaquillants" }],
  },
  {
    name: "Soins cheveux",
    icon: "💇",
    children: [{ name: "Anti-chute" }, { name: "Shampoings" }],
  },
  { name: "Protection solaire", icon: "☀️", children: [] },
  { name: "Compléments alimentaires", icon: "💊", children: [{ name: "Vitamines" }, { name: "Minceur" }] },
  { name: "Hygiène & corps", icon: "🧼", children: [] },
  { name: "Bébé & maman", icon: "🍼", children: [{ name: "Change & soins" }, { name: "Alimentation bébé" }] },
];

type SeedProduct = {
  name: string;
  brand: string;
  price: number;
  promoPrice?: number;
  cat: string; // nom catégorie parente
  sub?: string; // sous-catégorie
  image: string;
  short: string;
  featured?: boolean;
  isNew?: boolean;
  stock: number | null; // null = illimité
};

const IMG = {
  jar: "/products/cream-jar.svg",
  pump: "/products/pump-bottle.svg",
  tube: "/products/tube-solaire.svg",
  serum: "/products/serum-dropper.svg",
  spray: "/products/spray.svg",
  pills: "/products/pilules.svg",
  box: "/products/boite-soins.svg",
  baby: "/products/biberon.svg",
  flask: "/products/flacon.svg",
  soap: "/products/savon.svg",
};

const PRODUCTS: SeedProduct[] = [
  // ── Soins visage
  { name: "CeraVe Crème Hydratante Visage SPF25 52ml", brand: "CeraVe", price: 189, promoPrice: 159, cat: "Soins visage", sub: "Crèmes hydratantes", image: IMG.jar, short: "Hydratation longue durée avec céramides et protection solaire quotidienne.", featured: true, stock: null },
  { name: "Avène Tolérance Control Baume Apaisant 40ml", brand: "Avène", price: 165, cat: "Soins visage", sub: "Crèmes hydratantes", image: IMG.jar, short: "Baume apaisant pour peaux hypersensibles et réactives.", featured: true, stock: 12 },
  { name: "La Roche-Posay Effaclar Duo+ 40ml", brand: "La Roche-Posay", price: 219, promoPrice: 189, cat: "Soins visage", sub: "Nettoyants & démaquillants", image: IMG.serum, short: "Soin correcteur anti-imperfections et anti-marques brunes.", featured: true, stock: 8 },
  { name: "Vichy Minéral 89 Booster Quotidien 50ml", brand: "Vichy", price: 235, cat: "Soins visage", sub: "Crèmes hydratantes", image: IMG.flask, short: "Booster fortifiant à l'eau thermale volcanique et acide hyaluronique.", featured: true, stock: null },
  { name: "Nuxe Crème Prodigieuse Boost Multi-Correction 40ml", brand: "Nuxe", price: 249, cat: "Soins visage", sub: "Anti-âge", image: IMG.jar, short: "Soin multi-correction première ride, texture fondante.", stock: 15 },
  { name: "Filorga Time-Filler 5XP Crème Absolue 50ml", brand: "Filorga", price: 549, promoPrice: 469, cat: "Soins visage", sub: "Anti-âge", image: IMG.jar, short: "Crème anti-âge absolue ciblant les 5 types de rides.", isNew: true, stock: 6 },
  { name: "Bioderma Sensibio H2O Micellaire 500ml", brand: "Bioderma", price: 149, cat: "Soins visage", sub: "Nettoyants & démaquillants", image: IMG.flask, short: "Solution micellaire nettoyante pour peaux sensibles.", featured: true, stock: null },
  { name: "SVR Sebiaclear Gel Mousse Nettoyant 150ml", brand: "SVR", price: 139, cat: "Soins visage", sub: "Nettoyants & démaquillants", image: IMG.pump, short: "Gel moussant purifiant sans savon, peaux mixtes à grasses.", stock: 20 },

  // ── Soins cheveux
  { name: "Ducray Anaphase+ Shampooing Anti-Chute 200ml", brand: "Ducray", price: 175, promoPrice: 148, cat: "Soins cheveux", sub: "Anti-chute", image: IMG.pump, short: "Complément de traitement anti-chute de tous types de cheveux.", featured: true, stock: 14 },
  { name: "Klorane Quinine Bio Fortifiant 400ml", brand: "Klorane", price: 129, cat: "Soins cheveux", sub: "Shampoings", image: IMG.pump, short: "Shampoing fortifiant aux vitamines B pour cheveux affaiblis.", stock: null },
  { name: "Vichy Dercos Technique Densi-Solutions 400ml", brand: "Vichy", price: 199, cat: "Soins cheveux", sub: "Shampoings", image: IMG.pump, short: "Shampoing re-massifiant qui redonne corps et densité.", stock: 10 },
  { name: "René Furterer Forticea Séro-Stimulant 100ml", brand: "Furterer", price: 320, cat: "Soins cheveux", sub: "Anti-chute", image: IMG.spray, short: "Sérum anti-chute réactionnelle et chronique, cure 3 mois.", isNew: true, stock: 5 },
  { name: "Phyto Phytocyane Traitement Anti-Chute Femmes 12x7.5ml", brand: "Phyto", price: 389, cat: "Soins cheveux", sub: "Anti-chute", image: IMG.box, short: "Traitement capillaire anti-chute saisonnière féminine.", stock: 7 },
  { name: "Biokera B Specific Lotion Anti-Chute 12x10ml", brand: "Salerm Biokera", price: 298, promoPrice: 255, cat: "Soins cheveux", sub: "Anti-chute", image: IMG.box, short: "Lotion concentrée pour freiner la chute du cheveu.", stock: 9 },

  // ── Protection solaire
  { name: "Avène Solarie Cleanance Solaire SPF50+ 50ml", brand: "Avène", price: 239, promoPrice: 199, cat: "Protection solaire", image: IMG.tube, short: "Très haute protection solaire pour peaux à tendance acnéique.", featured: true, stock: null },
  { name: "La Roche-Posay Anthelios UVmune 400 SPF50+ 50ml", brand: "La Roche-Posay", price: 269, cat: "Protection solaire", image: IMG.tube, short: "Protection très haute UVA/UVB invisible, résistante à l'eau.", featured: true, stock: 18 },
  { name: "Vichy Capital Soleil UV-Age Daily SPF50+ 40ml", brand: "Vichy", price: 289, cat: "Protection solaire", image: IMG.tube, short: "Fluide quotidien anti-photo-âge, texture invisible.", isNew: true, stock: 11 },
  { name: "Bioderma Photoderm Max Aquafluide SPF50+ Teinté Claire 40ml", brand: "Bioderma", price: 245, promoPrice: 209, cat: "Protection solaire", image: IMG.tube, short: "Aquafluide teinté très haute protection, fini naturel.", stock: 13 },
  { name: "ISDIN Fusion Water Magic SPF50 50ml", brand: "ISDIN", price: 275, cat: "Protection solaire", image: IMG.tube, short: "Protection solaire hydratante à l'eau, idéal sport & ville.", stock: null },
  { name: "Uriage Bariésun Crème Minérale SPF50+ 50ml", brand: "Uriage", price: 210, cat: "Protection solaire", image: IMG.tube, short: "Filtres minéraux 100%, peaux intolérantes et enfants.", stock: 16 },

  // ── Compléments alimentaires
  { name: "Arkopharma Arkocapsules Artichaut 45 Gélules", brand: "Arkopharma", price: 89, cat: "Compléments alimentaires", sub: "Minceur", image: IMG.pills, short: "Confort digestif et drainage naturel au artichaut bio.", stock: null },
  { name: "Solgar Omega-3 Double Strength 50 Capsules", brand: "Solgar", price: 349, promoPrice: 299, cat: "Compléments alimentaires", sub: "Vitamines", image: IMG.pills, short: "Huile de poisson pure EPA/DHA pour cœur et cerveau.", featured: true, stock: 10 },
  { name: "Vitall+ Magnésium Marin + Vitamine B6 90 Comprimés", brand: "Vitall+", price: 159, cat: "Compléments alimentaires", sub: "Vitamines", image: IMG.pills, short: "Réduit fatigue nerveuse et crampes musculaires.", stock: null },
  { name: "Nutergia Ergyphilus Plus Fermentation 60 Gélules", brand: "Nutergia", price: 185, cat: "Compléments alimentaires", image: IMG.pills, short: "Probiotiques + prébiotiques pour l'équilibre intestinal.", isNew: true, stock: 12 },
  { name: "Pileje Taurine 500mg 90 Capsules", brand: "Pileje", price: 229, cat: "Compléments alimentaires", image: IMG.pills, short: "Acide aminé soutenant l'équilibre nerveux.", stock: 8 },
  { name: "Biocyanid Granions Oligo-Éléments Ampoules 28x10ml", brand: "Granions", price: 145, promoPrice: 125, cat: "Compléments alimentaires", image: IMG.flask, short: "Cure d'oligo-éléments pour la vitalité générale.", stock: 14 },
  { name: "Forté Pharma TurboDraine 28 Ampoules Goji", brand: "Forté Pharma", price: 199, cat: "Compléments alimentaires", sub: "Minceur", image: IMG.flask, short: "Programme drainant 28 jours saveur goji-citron.", stock: null },
  { name: "Vitamiforze Gummies Immunité 30 Bonbons", brand: "Vitamiforze", price: 119, cat: "Compléments alimentaires", sub: "Vitamines", image: IMG.box, short: "Gummies vitamine C/D/Zinc au goût agrumes.", isNew: true, stock: 22 },

  // ── Hygiène & corps
  { name: "Puressentiel Spray Purifiant Air 200ml", brand: "Puressentiel", price: 129, promoPrice: 109, cat: "Hygiène & corps", image: IMG.spray, short: "Assainit l'air avec 12 huiles essentielles essentielles.", featured: true, stock: null },
  { name: "Rogé Cavaillès Gel Lavant Intime Douceur 250ml", brand: "Rogé Cavaillès", price: 79, cat: "Hygiène & corps", image: IMG.soap, short: "Gel lavant intime au physiologique pH respecté au quotidien.", stock: null },
  { name: "Saforelle Solution Lavante Apaisante 500ml", brand: "Saforelle", price: 98, cat: "Hygiène & corps", image: IMG.flask, short: "Solution lavante douceur apaisante usage quotidien.", stock: 18 },
  { name: "A-Derma Gel Douche Surgras Foaming 500ml", brand: "A-Derma", price: 115, cat: "Hygiène & corps", image: IMG.pump, short: "Gel douche surgraissant protecteur pour toute la famille.", stock: 25 },
  { name: "Sanoflore Déodorant 24h Aucune Réserve 50ml", brand: "Sanoflore", price: 95, cat: "Hygiène & corps", image: IMG.spray, short: "Déodorant naturel efficace 24h sans sels d'aluminium.", stock: 14 },
  { name: "Cattier Dentargile Dentifrice Citron 75ml", brand: "Cattier", price: 55, promoPrice: 45, cat: "Hygiène & corps", image: IMG.soap, short: "Dentifrice argile blanche reminéralisant au citron.", stock: null },
  { name: "Mustela Eau de Soin Parfumée 90ml", brand: "Mustela", price: 175, cat: "Bébé & maman", image: IMG.baby, short: "Eau de soin délicate pour bébé, 97% ingrédients naturels.", stock: 9 },

  // ── Bébé & maman
  { name: "Mustela Hydra-Bébé Corps Lait 300ml", brand: "Mustela", price: 149, promoPrice: 129, cat: "Bébé & maman", sub: "Change & soins", image: IMG.baby, short: "Lait corporel hydratant renforcé pour la peau de bébé.", featured: true, stock: null },
  { name: "Bioderma ABCDerm Cold-Crème Corps 200ml", brand: "Bioderma", price: 135, cat: "Bébé & maman", sub: "Change & soins", image: IMG.baby, short: "Nourrit et protège les peaux fragiles des nourrissons.", stock: 11 },
  { name: "Weleda Calendula Crème Change 75ml", brand: "Weleda", price: 85, cat: "Bébé & maman", sub: "Change & soins", image: IMG.baby, short: "Crème de change bio au calendula apaisant.", featured: true, stock: null },
  { name: "Klorane Cap'Enfants Bébé Eryzinal Eau Lavante 500ml", brand: "Klorane", price: 119, cat: "Bébé & maman", sub: "Change & soins", image: IMG.baby, short: "Eau lavante sans rinçage anti-rougeurs du siège.", stock: 13 },
  { name: "Gifrer Sérum Physiologique Unidose 40x5ml", brand: "Gifrer", price: 49, cat: "Bébé & maman", sub: "Alimentation bébé", image: IMG.box, short: "Nettoyage nasal et oculaire quotidien en dosettes stériles.", stock: null },
  { name: "Hipp Bio Combiotik 1 Lait Premier Âge 800g", brand: "HiPP", price: 219, promoPrice: 195, cat: "Bébé & maman", sub: "Alimentation bébé", image: IMG.baby, short: "Lait infantile bio dès la naissance avec prébiotiques.", stock: 6 },
  { name: "Modilac Precision 2 Lait Relais 6-12 Mois 800g", brand: "Modilac", price: 205, cat: "Bébé & maman", sub: "Alimentation bébé", image: IMG.baby, short: "Lait suite enrichi en fer pour nourrissons 6–12 mois.", stock: 8 },
];

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED_IN_PROD !== "true") {
    console.error(
      "Refus d'exécuter le seed en production : il supprimerait les données et créerait des comptes par défaut.\n" +
        "Définissez ALLOW_SEED_IN_PROD=true uniquement si vous savez exactement ce que vous faites."
    );
    process.exit(1);
  }

  console.log("🌱 Nettoyage…");
  await prisma.activityLog.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.stockHistory.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.address.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.scrapeRun.deleteMany();

  console.log("📁 Catégories…");
  const catMap = new Map<string, number>();
  let order = 0;
  for (const parent of CATEGORIES) {
    const p = await prisma.category.create({
      data: { name: parent.name, slug: slugify(parent.name), icon: parent.icon, order: order++ },
    });
    catMap.set(parent.name, p.id);
    let childOrder = 0;
    for (const child of parent.children) {
      const c = await prisma.category.create({
        data: { name: child.name, slug: slugify(child.name), parentId: p.id, order: childOrder++ },
      });
      catMap.set(`${parent.name}/${child.name}`, c.id);
    }
  }

  console.log("🧴 Produits…");
  const productIds: number[] = [];
  for (let i = 0; i < PRODUCTS.length; i++) {
    const sp = PRODUCTS[i];
    const categoryId =
      sp.sub ? catMap.get(`${sp.cat}/${sp.sub}`) ?? catMap.get(sp.cat)! : catMap.get(sp.cat)!;

    const product = await prisma.product.create({
      data: {
        name: sp.name,
        slug: slugify(sp.name),
        brand: sp.brand,
        shortDescription: sp.short,
        description:
          `${sp.short}\n\nUtilisation : appliquer selon les recommandations de votre pharmacien. ` +
          `Format d'origine, produit authentique importé via nos circuits officiels.\n\n` +
          `Livré partout au Maroc en 24 à 48h. Paiement à la livraison disponible.`,
        price: sp.price,
        promoPrice: sp.promoPrice ?? null,
        sku: `PB-${String(1000 + i)}`,
        status: "PUBLISHED",
        stock: sp.stock ?? 0,
        unlimitedStock: sp.stock == null,
        isFeatured: !!sp.featured,
        isNew: !!sp.isNew,
        soldCount: Math.floor(Math.random() * 60),
        viewsCount: Math.floor(Math.random() * 900),
        categoryId,
        sourceName: i % 4 === 0 ? ["parapharma.ma", "mapara.ma", "phbeauty.ma"][i % 3] : "manuel",
      },
    });
    productIds.push(product.id);
    await prisma.productImage.create({
      data: { productId: product.id, url: sp.image, alt: sp.name, order: 0 },
    });

    if (sp.featured) {
      const samples = [
        ["Salma B.", 5, "Produit authentique, livraison rapide à Casablanca. Je recommande !"],
        ["Youssef A.", 4, "Bon rapport qualité-prix, conforme à la description."],
      ];
      for (const [author, rating, comment] of samples as [string, number, string][]) {
        await prisma.review.create({
          data: { productId: product.id, author, rating, comment, status: "APPROVED" },
        });
      }
    }
  }

  // Produits « à valider » issus du scraping (file de modération)
  console.log("🕸️ File de validation scraper…");
  const pendingSamples: SeedProduct[] = [
    { name: "La Roche-Posay Cicaplast Baume B5+ 100ml", brand: "La Roche-Posay", price: 158, cat: "Soins visage", image: IMG.jar, short: "Baume réparateur cutané pour irritations familiales.", stock: null },
    { name: "Uriage Xémose Crème Émolliente 400ml", brand: "Uriage", price: 232, promoPrice: 198, cat: "Soins visage", image: IMG.jar, short: "Soin émollient relipidant pour peaux atopiques.", stock: null },
    { name: "Ducray Kelual DS Crème Apaisante 40ml", brand: "Ducray", price: 187, cat: "Soins visage", image: IMG.serum, short: "Élimine squames et rougeurs des peaux squameuses.", stock: null },
  ];
  for (const sp of pendingSamples) {
    const product = await prisma.product.create({
      data: {
        name: sp.name,
        slug: slugify(sp.name),
        brand: sp.brand,
        shortDescription: sp.short,
        description: sp.short,
        price: sp.price,
        promoPrice: sp.promoPrice ?? null,
        status: "PENDING_REVIEW",
        stock: 0,
        unlimitedStock: true,
        categoryId: catMap.get(sp.cat)!,
        sourceName: "parapharma.ma",
      },
    });
    await prisma.productImage.create({
      data: { productId: product.id, url: sp.image, alt: sp.name, order: 0 },
    });
  }

  console.log("⭐ Exécution scraper de démonstration…");
  await prisma.scrapeRun.create({
    data: {
      sourceName: "parapharma.ma",
      finishedAt: new Date(Date.now() - 3600_000 * 6),
      startedAt: new Date(Date.now() - 3600_000 * 6 - 240_000),
      status: "SUCCESS",
      addedCount: pendingSamples.length,
      updatedCount: 4,
      missingCount: 1,
      errorCount: 0,
      log: `${new Date(Date.now() - 3600_000 * 6).toISOString()} robots.txt : aucun blocage pour les crawlers génériques\n${new Date().toISOString()} [liste] https://www.parapharma.ma/soins-du-visage → 24 liens produit détectés\n${new Date().toISOString()} [ajouté] La Roche-Posay Cicaplast Baume B5+ 100ml\n${new Date().toISOString()} [ajouté] Uriage Xémose Crème Émolliente 400ml\n${new Date().toISOString()} [ajouté] Ducray Kelual DS Crème Apaisante 40ml\n${new Date().toISOString()} [modifié] CeraVe Crème Hydratante (price)\n${new Date().toISOString()} Terminé : +3 ajoutés, ~4 modifiés, 0 erreurs`,
    },
  });

  console.log("🎟️ Codes promo…");
  await prisma.coupon.createMany({
    data: [
      { code: "BIENVENUE10", type: "PERCENT", value: 10, minOrder: 200, active: true },
      { code: "SOLAIRE20", type: "PERCENT", value: 20, minOrder: 300, active: true },
      { code: "MOINS29", type: "FIXED", value: 29, minOrder: 150, active: true },
    ],
  });

  console.log("👥 Comptes…");
  await prisma.adminUser.createMany({
    data: [
      { email: "admin@parabeauregard.ma", passwordHash: hashPassword("admin123"), name: "Mohamed Taha", role: "SUPER_ADMIN" },
      { email: "gestionnaire@parabeauregard.ma", passwordHash: hashPassword("gestion123"), name: "Salwa Catalogue", role: "CATALOG_MANAGER" },
      { email: "commandes@parabeauregard.ma", passwordHash: hashPassword("commandes123"), name: "Karim Commandes", role: "ORDER_MANAGER" },
    ],
  });

  const customer = await prisma.customer.create({
    data: {
      email: "client@demo.ma",
      passwordHash: hashPassword("client123"),
      firstName: "Imane",
      lastName: "El Fassi",
      phone: "0661223344",
      addresses: {
        create: {
          label: "Domicile",
          fullName: "Imane El Fassi",
          phone: "0661223344",
          street: "42 rue Ibn Batouta, Apt 5",
          city: "Casablanca",
          postalCode: "20250",
          isDefault: true,
        },
      },
    },
  });

  console.log("📦 Commande de démonstration…");
  const orderProducts = (
    await Promise.all(productIds.slice(0, 3).map((pid) => prisma.product.findUnique({ where: { id: pid } })))
  ).filter((p): p is NonNullable<typeof p> => p !== null);
  const subtotal = orderProducts.reduce((s, p) => s + (p.promoPrice ?? p.price), 0);
  await prisma.order.create({
    data: {
      reference: `PB-${new Date().getFullYear()}-482910`,
      customerId: customer.id,
      status: "SHIPPED",
      paymentMethod: "COD",
      fullName: "Imane El Fassi",
      email: customer.email,
      phone: "0661223344",
      addressStreet: "42 rue Ibn Batouta, Apt 5",
      addressCity: "Casablanca",
      addressPostal: "20250",
      subtotal,
      shippingCost: subtotal >= 300 ? 0 : 29,
      total: subtotal + (subtotal >= 300 ? 0 : 29),
      items: {
        create: orderProducts.map((p) => ({
          productId: p.id,
          productName: p.name,
          productSlug: p.slug,
          unitPrice: p.promoPrice ?? p.price,
          quantity: 1,
        })),
      },
    },
  });

  console.log("⚙️ Paramètres par défaut…");
  for (const s of [
    { key: "scrape_frequency_hours", value: "6" },
    { key: "auto_publish", value: "false" },
  ]) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }

  console.log(`
✅ Seed terminé !
   • ${PRODUCTS.length} produits publiés + ${pendingSamples.length} à valider
   • Admin   : admin@parabeauregard.ma / admin123
   • Client  : client@demo.ma / client123
   • Coupons : BIENVENUE10 · SOLAIRE20 · MOINS29
`);
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
