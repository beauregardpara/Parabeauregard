export type Locale = "fr" | "ar";

export const DEFAULT_LOCALE: Locale = "fr";

export const RTL_LOCALES: Locale[] = ["ar"];

export const translations: Record<Locale, Record<string, string>> = {
  fr: {
    accueil: "Accueil",
    produits: "Produits",
    promotions: "Promotions",
    marques: "Marques",
    panier: "Panier",
    compte: "Compte",
    rechercher: "Rechercher",
    voirTout: "Voir tout",
    triNouveautes: "Nouveautés d'abord",
    chargerPlus: "Charger plus",
    retourAccueil: "Retour à l'accueil",
  },
  ar: {
    accueil: "الرئيسية",
    produits: "المنتجات",
    promotions: "التخفيضات",
    marques: "العلامات",
    panier: "السلة",
    compte: "حسابي",
    rechercher: "بحث",
    voirTout: "عرض الكل",
    triNouveautes: "الأحدث أولاً",
    chargerPlus: "تحميل المزيد",
    retourAccueil: "العودة إلى الرئيسية",
  },
};

export function translate(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return translations[locale]?.[key] ?? translations[DEFAULT_LOCALE]?.[key] ?? key;
}