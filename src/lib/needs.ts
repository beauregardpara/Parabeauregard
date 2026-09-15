export type Need = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  keywords: string[];
};

export const NEEDS: Need[] = [
  {
    slug: "peau-seche",
    title: "Peau sèche",
    tagline: "Hydratation et confort au quotidien",
    description:
      "Pour les peaux qui tiraillent ou se déshydratent régulièrement, nous avons rassemblé des soins riches et doux : crèmes hydratantes, laits corporels et nettoyants sans savon, pensés pour préserver le film cutané.",
    keywords: ["crème hydratante", "peau sèche", "lait hydratant", "corps hydratant", "soin visage hydratant"],
  },
  {
    slug: "anti-acne",
    title: "Imperfections & acné",
    tagline: "Des soins purifiants adaptés aux peaux à tendance acnéique",
    description:
      "Gels nettoyants, lotions purifiantes et soins ciblés pour les peaux à tendance acnéique. Des formules douces pour nettoyer la peau sans l'agresser, à intégrer dans une routine de soin régulière.",
    keywords: ["acné", "imperfections", "purifiant", "peau grasse", "anti imperfections"],
  },
  {
    slug: "anti-age",
    title: "Anti-âge & éclat",
    tagline: "Routines de soin pour l'éclat et le confort de la peau mature",
    description:
      "Huiles, sérums et crèmes anti-rides pour accompagner la peau mature au quotidien. Des soins nourrissants et régénérants qui apportent confort, souplesse et éclat, pour une routine ciblée.",
    keywords: ["anti-âge", "rides", "sérum antirides", "peau mature", "soin éclat"],
  },
  {
    slug: "soin-capillaire",
    title: "Soin capillaire",
    tagline: "Cheveux forts, brillants et en bonne santé",
    description:
      "Shampoings, masques et soins sans rinçage pour cheveux secs, gras ou colorés. Des gammes capillaires qui nettoient en douceur et facilitent le coiffage, adaptées aux besoins de vos cheveux.",
    keywords: ["shampoing", "soin capillaire", "cheveux secs", "masque cheveux", "sérum capillaire"],
  },
  {
    slug: "energie-vitamines",
    title: "Énergie & vitamines",
    tagline: "Bien-être au quotidien",
    description:
      "Compléments alimentaires en vitamines, minéraux et plantes pour soutenir la vitalité au quotidien. Les alliés d'une alimentation équilibrée et d'un mode de vie actif.",
    keywords: ["vitamines", "magnésium", "complément alimentaire énergie", "multivitamines", "zinc"],
  },
  {
    slug: "bebe",
    title: "Bébé & maternité",
    tagline: "Douceur pour les peaux de bébé",
    description:
      "Soins du change, nettoyants délicats, laits hydratants et gammes maternité formulées pour les peaux fragiles des tout-petits. Des produits doux, testés et adaptés à l'usage quotidien.",
    keywords: ["bébé", "peau fragile", "soin du change", "lait de toilette", "crème bébé"],
  },
];

export function getNeedBySlug(slug: string): Need | undefined {
  return NEEDS.find((n) => n.slug === slug);
}