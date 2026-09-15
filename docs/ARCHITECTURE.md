# Architecture

Para Beauregard — plateforme e-commerce parapharmacie (Next.js 15, App Router, React 19, TypeScript strict, Tailwind v4, Prisma 6 + SQLite).

## Vue d'ensemble

- **Boutique publique** : pages rendues côté serveur (RSC), panier/favoris/comparateur/recent en `localStorage` via Context, assistant IA en widget flottant.
- **Backoffice `/admin`** : session dédiée (`pb_admin`), RBAC à granularité action (permissions), journaux.
- **Scraper** : CLI `tsx` + route API + scheduler en boucle, stockage image local.
- **Base de données** : SQLite (démo) / PostgreSQL (prod), Prisma.

## Couches

```
public pages (RSC) ──> lib/actions (server actions, zod) ──> lib/security (rate-limit) ──> db (Prisma)
        │                            │
        └───── components (client)   └─ lib/search · lib/chat · lib/scraper
```

- `src/lib/db.ts` — singleton Prisma (préserve l'instance hors production via global cache).
- `src/lib/validation/` — schémas Zod uniques réutilisés par les server actions et les routes API.
- `src/lib/security/rate-limit.ts` — fenêtres glissantes en mémoire. `getClientIp()` honore
  `X-Forwarded-For` uniquement si `TRUSTED_PROXY=true`; `getServerActionIp()` lit IP + UA via
  `next/headers` pour les server actions. Limites distinctes par endpoint (login, contact,
  register, checkout, admin, chat, scrape).
- `src/lib/actions/` — toutes les mutations (client : register/login/contact/checkout ;
  admin : produits, commandes, coupons, rôles, scraper settings). Chaque action admin vérifie
  `requirePermission()` et journalise via `logAction`.

## Checkout (ordre transactionnel)

`src/lib/actions/order.ts` — une seule `$transaction` pour :
1. valider le panier (zod) et relire les produits en base ;
2. décrémenter le stock de façon **atomique** (`updateMany … where stock >= qty`),
   erreurs `STOCK_INSUFFICIENT` par produit (plus de réduction silencieuse) ; les produits en
   stock illimité incrémentent seulement `soldCount`, sans écriture d'historique ;
3. appliquer le coupon **dans la transaction** (findUnique + contrôle plage/utilisations +
   `update … increment`), les contrôles hors transaction servant de premier filtre ;
4. créditer les points fidélité (`loyalty_points_per_dhs`) via le registre `LoyaltyTransaction` ;
5. générer une référence `PB-AAAA-XXXXXXXX` et un `confirmationToken` (24 octets) pour la
   page de suivi.

`updateOrderStatus(CANCELLED)` compense dans une transaction : remise en stock (produits non
illimités seulement), révocation des points (`SPENT`), décrément de l'usage du coupon. Le statut
est re-vérifiée avant compensation (une commande déjà annulée n'est pas reconstituée).

## Authentification

- Mots de passe : `scrypt` (salt 128 bits, clé 64 octets), comparaison `timingSafeEqual`.
- Sessions : jeton `{ sub, email, role, exp }` signé HMAC-SHA256, 30 jours, cookie `httpOnly`
  + `sameSite:lax`, `secure` en production. `readSessionToken` vérifie signature puis expiration.
- Inscription : message d'erreur volontairement générique (anti-énumération d'emails).
- Login (client & admin) : rate-limit par IP (7 essais / 10 min), verrouillage 10 min.

## Scraper

Voir `docs/SCRAPER.md` (résumé ci-dessous).

- Connecteurs : `mapara.ma`, `phbeauty.ma`, `universparadiscount.ma` (actifs via le réglage
  `activeSources`). `parapharma.ma` a été retiré (Cloudflare 401).
- `src/lib/scraper/http.ts` — parser `robots.txt` (règles regroupées par `User-agent`,
  `Disallow` appliqué au chemin, support `$`), `politeFetch` avec délai aléatoire, `fetchHtml`
  3 essais backoff exponentiel + jitter, retry sur 429/5xx/520-524 et erreurs réseau.
- `src/lib/scraper/engine.ts` — `runScrape(key)` crée un `ScrapeRun`, lit `auto_publish` du
  réglage admin (saute les URLs bloquées par robots, marque le run FAILED si le domaine entier
  est bloqué), upsert produits **transactionnel** avec historiques prix/stock (valeurs
  avant/après réelles), publication selon `autoPublish`. Stock dit « honnête » : pas de quantité
  fiable côté sources → « en stock » = stock illimité, « en rupture » = `stock 0`.
- `schedule-scrape.ts` — garde anti-double : une source avec un run RUNNING est ignorée.

## Frontend mobile-first

- Navigation bas d'écran (`bottom-nav.tsx`, utilitaires `.bottom-nav/.bn-count/.has-bottom-nav`)
  + panier dans un tiroir, badge compteur d'articles.
- Galerie produit : lightbox complet (zoom 2×, flèches, clavier, focus trap, scroll lock, aria).
- Accessibilité : `:focus-visible` global, `prefers-reduced-motion`, skeletons (`loading.tsx`).

- `src/lib/use-escape-close.ts` — hook partagé : fermeture d'un panneau ouvert par `Escape`
  (menu catégories, panier, filtres, chat, admin shell). Tous ces panneaux posent `inert`
  quand fermés (retirés de l'ordre de tabulation) + `aria-modal` quand ouverts.

## Tests

- `tests/` + vitest (alias `@` → `src`, mocks `server-only`, `next/headers`, `@/lib/db`).
  Couvre : hash/vérification mot de passe, intégrité/expiration des jetons de session,
  `parseMoroccanPrice` (espaces, virgules, points milliers), `detectAvailability`,
  schémas Zod (checkout, coupons, login), `parseNeed` (budget, fourchettes, mots-clés),
  non-régression V2.1 (SSRF guard, rate-limit anti-spoofing, XSS emails, redaction logger).
- E2E (Playwright, `e2e/`) : projets `chromium` (desktop, axe-core niveau A, API/headers)
  et `mobile-iphone` (bottom-nav, drawers, sticky CTA). Voir `docs/TESTING.md`.
- Commandes : `npm test` (vitest), `npm run test:e2e` (build requis au préalable),
  `npm run typecheck`.

## Scellement final attendu

`npm run typecheck` et `npm run build` doivent passer à blanc (build génère le client Prisma
avant `next build`).