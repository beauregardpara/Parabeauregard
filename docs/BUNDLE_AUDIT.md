# BUNDLE_AUDIT — V2.1 (THIQTI.MA)

> Chiffres relevés sur un build de production **Next.js 15.5.23** (webpack, `npm run build`),
> Node 24.12.0 / Windows. Build deterministe : `✓ Compiled successfully in 30.1s`, exit code 0.

## 1. JS chargé par le client

| Route | Page (JS) | First Load JS | Statut |
|---|---|---|---|
| Accueil `/` | `133 B` | `103 kB` | ƒ dynamique |
| `/recherche`, `/categories/[slug]`, `/nouveautes`, `/promotions` | `133 B` | `103–116 kB` | ƒ dynamique |
| `/produits/[slug]` | `3.13 kB` | `119 kB` | ƒ dynamique |
| `/panier` | `4.61 kB` | `116 kB` | ƒ dynamique |
| `/commander` (checkout) | `4.99 kB` | `116 kB` | ƒ dynamique |
| Connexion admin `/admin/login` | `1.3 kB` | `104 kB` | ƒ dynamique |
| Pages légales (`/cgv`, `/faq`, …) | `176 B` | `103 kB` | ƒ dynamique |
| `robots.txt`, `sitemap.xml`, `manifest` | — | statique |

**First Load JS partagé par toutes les routes : 103 kB**
  - `chunks/1255-…js` — 46.4 kB
  - `chunks/4bd1b696-…js` — 54.2 kB
  - autres chunks partagés — 1.99 kB

**Middleware : 34 kB** (edge, sécurisation `/admin` et anti-scraping public).

### Lecture
- Le socle partagé est très compact (**103 kB**, dont ~71 kB de React/Next/ReactDOM). Toutes
  les pages restent sous **120 kB** de JS total au chargement. Objectif « < 150 kB webpack » atteint.
- Aucune route ne charge de dépendance lourde tierce au-delà de l'UI de base
  (chunks réceptionnés hors partagé : 0–5 kB par route).
- `lucide-react` (icônes) est en import arborescent, `next/image` désactivé
  (`images.unoptimized: true`, pas de traitement `sharp` au runtime).

## 2. Sortie standalone (Docker)

| Artefact | Taille |
|---|---|
| `.next/standalone/` (runtime serveur + node_modules utiles) | **134 MB** |
| `.next/static/` (assets client) | **1.4 MB** |
| `public/` (images produits, SVG, manifest) | **52 MB** |

> > Le `public/` (52 MB) domine l'image finale : c'est le catalogue d'images produits.
> Si l'hébergement doit minimiser l'image, servir `public/` depuis un object storage (R2/S3)
> et l'exclure du `COPY` réduira l'image à ~135 MB.

## 3. Poids réseau (HTML) estimé
Page moyenne : ~12–25 kB de HTML (RSC dynamique). Les images illustrées sont des SVG
composants (`public/products/*.svg`, compressés), pas de photos lourdes.

## 4. Dépendances — état de l'audit `npm audit`

**6 vulnérabilités « high », toutes transitives, corrigeables uniquement via `next@16` (breaking) :**

| Package | Adversaire | Fix | Impact réel |
|---|---|---|---|
| `deepmerge-ts <8.0.0` (stack exhaustion) | via `@prisma/config` → `prisma` (CLI, build-time) | maj Prisma | **aucun au runtime serveur** (outil dev) |
| `postcss <=8.5.22` (XSS stringify, sourceMappingURL disclosure) | via `next` (build-time minifier) | `next@16` | **aucun au runtime** : CSS compilé à la build, pas de sourcemaps servies |
| `sharp <0.35.0` (CVE libvips) | via `next` | `next@16` | **non invoqué** : `images.unoptimized: true` ⇒ aucun traitement d'image au runtime |

**Position assumée (V2.1)** : rester sur Next 15 LTS (stable, standalone validé, build webpack
maîtrisé). La montée Next 16 est un chantier distinct (breaking). Aucune des 6 CVE n'est
exploitable sur ce storefront tel qu'il est servi (build-time / outil CLI / fonction désactivée).

## 5. Recommandations non bloquantes (P3)
- Vider `.next/cache` en CI si un build devient flaky sous Node ≥ 23 (hasher webpack corrigé en V2.1 via `hashFunction: "sha256"`, mais les artefacts corrompus après un crash restent toxiques).
- Surveiller le poid `public/` à chaque ajout d'images (toujours SVG/WebP < 100 kB).
- Ajouter `lucide-react` en tree-shaking vérifié (déjà OK) et un budget bundle en CI (pas ajouté : hors périmètre V2.1).