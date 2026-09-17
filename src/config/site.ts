/**
 * Source unique de vérité pour l'URL publique du site.
 *
 * Toute la SEO (metadataBase, canonical, OpenGraph, sitemap, robots, JSON-LD)
 * et les liens des emails transactionnels doivent lire SITE_URL d'ici,
 * jamais `process.env.NEXT_PUBLIC_SITE_URL` directement : un domaine
 * personnalisé se configure alors en changeant une seule variable
 * d'environnement, sans toucher au code.
 */

/** Domaine utilisé tant qu'aucun domaine personnalisé n'est configuré. */
export const DEFAULT_SITE_URL = "https://para-beauregard.vercel.app";

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/** URL publique canonique, sans slash final. */
export const SITE_URL: string = normalize(
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL
);

/** `true` lorsque le site tourne encore sur le domaine Vercel par défaut. */
export const IS_DEFAULT_SITE_URL: boolean = SITE_URL === DEFAULT_SITE_URL;

/** Construit une URL absolue canonique à partir d'un chemin relatif. */
export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
