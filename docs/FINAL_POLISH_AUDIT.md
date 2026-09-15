# FINAL POLISH AUDIT — THIQTI.MA (ex-Para Beauregard)

> Audit de stabilisation V2.1 réalisé par 5 agents spécialisés (Performance·Accessibilité·Observabilité·Sécurité·QA) sur le code livré en V2. Seuls les points **vérifiés** au code sont listés. Priorité : P0 (bloquant) → P1 (correctif réaliste) → P2 (normalisation) → P3 (dette / idéal).

## Résultats globaux

- **P0 : 1** — `lint` et construction Docker absents (mission : exiger `npm run lint` vert + Dockerfile). Aucune faille critique du produit (auth, RBAC, checkout) n'a été détectée.
- **P1 : 15** — dont 1 contournement CSP bloquant les images en prod, 1 bypass rate-limit, 5 défauts accessibilité, 1 XSS potentielle (emails), logging non structuré.
- **P2/P3 :** liste ci-dessous (dettes assumées, documentées, non traitées toutes en V2.1).

---

## SÉCURITÉ (Agent D, vérifié)

| # | Sev | Fichier | Constat | Traitement |
|---|-----|---------|---------|-----------|
| S1 | P1 | `src/lib/security/rate-limit.ts:90-104` | `getServerActionIp()` lit `x-forwarded-for` même sans `TRUSTED_PROXY=true` → spoofing possible du rate-limit des actions serveur | ✅ Corrigé (refus XFF sans proxy de confiance) |
| S2 | P1 | `src/lib/email/templates.ts` | Interpolations `${value}` non échappées (nom, note, status, total) → XSS potentielle dans l'email HTML | ✅ Corrigé (helper `esc`) |
| S3 | P1 | `prisma/seed.ts:263-269` | Seed crée des comptes admin par défaut ; si exécuté en prod → comptes par défaut actifs | ✅ Corrigé (refus si `NODE_ENV=production` sauf `ALLOW_SEED_IN_PROD=true`) |
| S4 | P1 | `src/lib/scraper/http.ts:178-230` | `downloadImage`/`searchProductImages` arborent les URL d'images scrappées serveur : un produit malveillant **admin-only** pourrait requêter des hôtes internes (SSRF limité) | ✅ Corrigé (refus loopback/privé/APIPA) |
| S5 | OK | `src/app/api/admin/scrape/route.ts:15-18` | Déjà protégé par session admin + `hasPermission("scraper:write")` | — vérifié, rien à faire |
| S6 | OK | `src/lib/auth.ts:66-97` | Cookies `httpOnly`, `sameSite: lax`, `secure` en prod (verify) | — |
| S7 | OK | suivi-commande, returns | IDOR/coupe anti-énumération par token ou ownership (verify) | — |
| S8 | OK | checkout | Quantités bornées 1…99 + revalidation serveur (verify) | — |
| S9 | P2 | header CSP `script-src 'unsafe-inline' 'unsafe-eval'` | Assouplissements nécessaires au runtime Next, à resserrer avec un vrai CDN/SRI | Documenté (voir SECURITY.md) |

## OBSERVABILITÉ (Agent C, vérifié)

| # | Sev | Fichier | Constat | Traitement |
|---|-----|---------|---------|-----------|
| O1 | P1 | global | 20 `console.*` non structurés ; aucune corrélation `requestId`, ni module/timing/errorCode ; codes `AppError` jamais loggés | ✅ Corrigé : `src/lib/logger/` + branchements cibles + `requestId` |
| O2 | P1 | `src/app/api/chat/route.ts:180-188` | TIMEOUT 30 s traité comme une erreur générique | ✅ Corrigé (`errorCode:"CHAT_TIMEOUT"`, log métier) |
| O3 | OK | `src/app/api/health/route.ts` | Ne fuite aucun secret (booléens + compteurs + latence) | ✅ Amélioré (version, secondes, tous services "non configuré", timeout) |
| O4 | P2 | scripts scraper (engine, enrich, compare, firecrawl) | Erreurs brutes sans contexte structuré | ✅ Branchés sur le logger (module `scraper`) |

## PERFORMANCE (Agent A, vérifié)

| # | Sev | Fichier | Constat | Traitement |
|---|-----|---------|---------|-----------|
| P1 | P1 | `next.config.ts:20` | CSP `img-src 'self' data: blob:` bloque les images distantes (produits) en prod (fetch serveur → image.html des échecs) | ✅ Corrigé : `img-src 'self' https: data: blob:` |
| P2 | P1 | `src/app/layout.tsx:114-117` | Layout racine dynamique (cookies) → le `revalidate=60` des routes publiques est neutralisé (ISR mort) | ⚠️ Documenté (P2 dans BUNDLE_AUDIT) : refactor user-state = risque > bénéfice en V2.1 |
| P3 | P1 | `src/lib/analytics.ts:7-68` | `getRevenueSeries` + `getRevenueByCategory` chargent toutes les commandes (avec nested items) à chaque ouverture admin | ✅ Corrigé : cache `unstable_cache` 120 s (fractions) |
| P4 | P2 | `src/app/api/search/route.ts` | Recherche texte = scans `LIKE %…%` (dev SQLite / PG) | ⚠️ Documenté (P2 : index trigram PG en phase PG) |
| P5 | P3 | product-image / gallery | Miniatures chargent l'original full-size (`unoptimized`). Impossible sans pipeline de redimensionnement | ⚠️ Documenté (P3) |
| P6 | P3 | `scripts/*.mjs` `src/scripts/*.ts` | Recherche d'images par scraping moteurs (DDG/Bing/Google) fragile | Documenté (dette assumée) |

## ACCESSIBILITÉ / UX (Agent B, vérifié)

| # | Sev | Fichier | Constat | Traitement |
|---|-----|---------|---------|-----------|
| A1 | P1 | `src/components/header.tsx:217-267` | `CartDrawer` : dialog resté monté fermé (tabulable + lu par lecteurs d'écran), pas d'Escape ni de retour de focus | ✅ Corrigé : `inert`, `aria-modal`, Escape, focus/retour |
| A2 | P1 | `src/components/chat-widget.tsx:89-165` | Idem ; pas de focus initial, pas d'Escape, pas d'`aria-live` sur les messages | ✅ Corrigé |
| A3 | P1 | `src/components/header.tsx:119-126` | Menu « Catégories » hover-only → inaccessible au clavier malgré `aria-expanded` | ✅ Corrigé : toggle clic/clavier |
| A4 | P1 | `src/components/filters.tsx:79-116` | Drawer filtres mobile toujours dans le DOM, pas d'Escape | ✅ Corrigé : `inert` + Escape |
| A5 | P1 | `src/components/sticky-add-to-cart.tsx:25` + `globals.css:518-531` | CTA fixe `z-40` masqué par la bottom-nav `z-60` | ✅ Corrigé : `z-[65]` + décalage safe-area |
| A6 | P1 | `src/components/product-card.tsx:80` | Marque `text-para-400` (#2dd4bf) ≈ 1.9:1 sur blanc → échec WCAG AA | ✅ Corrigé : `text-para-700` |
| A7 | P1 | `src/app/globals.css` (animations) | Mouvements continus (spin, floats) sans `prefers-reduced-motion` | ✅ Corrigé : bloc `@media (prefers-reduced-motion)` global |
| A8 | P2 | `src/components/admin-shell.tsx:44-85` | Sidebar admin : drawer mobile sans `inert`/Escape | ✅ Corrigé (léger) |
| A9 | P2 | labels onglets/filtres/tables admin, `aria-live` résultats recherche, alt images décoratives | Normalisation | Partiellement traité, reste documenté |

## QA / NON-RÉGRESSION (Agent E, vérifié)

| # | Sev | Fichier | Constat | Traitement |
|---|-----|---------|---------|-----------|
| Q1 | P2 | e2e | Seuls 10 specs (6 store + 4 admin) ; aucune couverture a11y (axe) ni mobile | ✅ Corrigé : projet mobile + specs axe + non-régression |
| Q2 | P2 | `playwright.config.ts` | Un seul viewport desktop | ✅ Corrigé |
| Q3 | OK | dev.db | Spécs e2e portables (aucune dépendance aux produits seedés) | — |

## DEVOPS / PROCESS (vérifié)

| # | Sev | Constat | Traitement |
|---|-----|---------|-----------|
| D1 | P0 | Aucun Dockerfile / .dockerignore (mission §24-25) | ✅ Corrigé |
| D2 | P0 | Aucun ESLint config ni script `lint` (mission : gate `npm run lint` 0 erreur) | ✅ Corrigé |
| D3 | P1 | `.env.example` minimal (manque SENTRY + vars email documentées) | ✅ Corrigé |
| D4 | P2 | CI : builds webpack en parallèle, pas de job lint, pas de timeouts ni de cache npm | ✅ Corrigé |
| D5 | P2 | Pas de `output: "standalone"` (image Docker → .next lean) | ✅ Corrigé |

---

## Dettes assumées (P3, documentées)
- Pipeline de redimensionnement/optimisation d'images (miniatures full-size).
- Indexation texte PG (trigram) pour la recherche.
- Rapprochement CSS `unsafe-inline` via hashes/SRI. Redis provider pour le rate-limiter multi-instance.
- `revalidate=60` inerte tant que le layout racine lit les cookies (refactor user-state client prévu en V3).

## Légende des indicateurs
- ✅ Corrigé en V2.1 — revisité dans FINAL_PRODUCTION_REPORT.md (tableau avant/après).
- ⚠️ Documenté non traité en V2.1 — volonté explicite : qualité sans casse.