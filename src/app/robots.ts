import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";

/**
 * Rendu a chaque requete, comme le sitemap.
 *
 * Genere au build, ce fichier figeait l'adresse connue a ce moment-la : le
 * `robots.txt` en ligne annoncait le sitemap sur l'ancien domaine Vercel alors
 * que le site tournait sur Railway. Un changement de domaine se limite ainsi a
 * la variable d'environnement, sans reconstruction.
 */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL;
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/commander", "/commande"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
