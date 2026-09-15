# Roadmap V2 — Para Beauregard

Audit structuré (Phase 0) et plan d'exécution de la mission V2.
Priorités : **P0** = critique / blocant, **P1** = majeur, **P2** = secondaire, **P3** = cosmétique / non bloquant.
Statut : `todo` | `en cours` | `fait`.

---

## P0 — Critique (corriger maintenant)

| # | Fonctionnalité | Fichiers concernés | Dépendances | Risques | Statut |
|---|---|---|---|---|---|
| 0.1 | Audit structuré + trajectoire V2 | `docs/ROADMAP_V2.md`, `docs/FINAL_V2_REPORT.md` | — | — | fait |
| 0.2 | Suivi de commande publique avec timeline : historiser chaque changement de statut (`OrderStatusHistory`), recherche par référence + token opaque, jamais par ID séquentiel | `prisma/schema.prisma` (modèle + index), `src/lib/actions/admin.ts`, `src/lib/actions/order.ts`, `src/app/suivi-commande/page.tsx`, `src/app/suivi-commande/[reference]/page.tsx` | F2 | corriger statut sans historiser → timeline vide ; accès via ID = fuite d'info | fait |
| 0.3 | Emails transactionnels (confirmation commande, statut, expédition, retour, alerte stock) via abstraction `src/lib/email/` ; fournisseur optionnel, **no-op sans provider** ; journal `email_logs` | `prisma/schema.prisma`, `src/lib/email/` (nouveau), lifecycle commande dans `order.ts`/`admin.ts` | F2 | secrets hardcodés ; envoi bloquant sur le chemin de commande → toujours `await sendEmail` tolerant aux erreurs, loggable | fait |
| 0.4 | Livraison configurable unifiée depuis les réglages (frais fixes, frais par ville, seuil gratuité) exposée partout via `getCheckoutSettings` | `src/lib/settings.ts`, `src/lib/actions/order.ts`, `src/app/commander/page.tsx`, `src/app/admin/(dashboard)/reglages/page.tsx` | — | incohérence frais panier vs commande | fait |
| 0.5 | Demande de retour (`ReturnRequest`) avec raison, statut (pending/approved/rejected), rattachement à la commande + token | `prisma/schema.prisma`, `src/lib/actions/returns.ts`, `src/app//retour/page.tsx`, `src/app/admin/(dashboard)/retours/page.tsx` | F2 | retours sur commandes non livrées → vérifier statut `DELIVERED` | fait |
| 0.6 | Gestion d'erreurs typées + état de healthcheck | `src/lib/errors.ts`, `src/app/api/health/route.ts` | — | erreurs génériques masquant la cause réelle | fait |

## P1 — Majeur (le plus vite après P0)

| # | Fonctionnalité | Fichiers concernés | Dépendances | Risques | Statut |
|---|---|---|---|---|---|
| 1.1 | Analytics avancées : CA journalier (7/30 j), top catégories, répartition COD/CMI, taux d'annulation, conversion panier→commande | `src/app/admin/(dashboard)/page.tsx`, `src/lib/analytics.ts` (nouveau) | — | requêtes N+1 → agrégations Prisma uniques | fait |
| 1.2 | Page `/admin/system` : état DB, sessions, erreurs, mémoire, env vérifié | `src/app/admin/(dashboard)/system/page.tsx`, `src/lib/system.ts` | 0.6 | exposer des secrets → désinfection systématique | fait |
| 1.3 | `/admin/quality` : score de qualité par produit (images, description, prix cohérent, doublons), anomalies scraper (`DataQualityIssue`) | `prisma/schema.prisma`, `src/lib/scraper/quality.ts`, `src/app/admin/(dashboard)/quality/page.tsx` | scraper | scores arbitraires → algorithme explicite et documenté | fait |
| 1.4 | Recherche sémantique : synonymes + normalisation (pluriels, accents, translittération AR) | `src/lib/search/synonyms.ts` (nouveau), `src/lib/search.ts`, `src/app/api/search/route.ts` | — | sur-normalisation = résultats vides → fallback sur sous-chaîne | fait |
| 1.5 | Alertes stock (`ProductAlert`) : déclenchement au retour de stock via scraper + email | `prisma/schema.prisma`, `src/lib/actions/returns.ts`, `src/lib/scraper/engine.ts` | 0.3 | spam → déduplication par produit+email | fait |
| 1.6 | Recommandations : produits similaires (même catégorie/brand), populaires, nouveautés, personnelles (historique commandes) | `src/lib/recommendations.ts`, `src/app/produits/[slug]/page.tsx` | — | coût de requêtes → stratégies en `take` borné | fait |
| 1.7 | Contexte assistant multi-tour : `ProductNeed` persisté par session, enrichissement des hits par intentions | `prisma/schema.prisma` (option), `src/lib/chat.ts`, `src/lib/chat/context.ts` | — | fuite d'infos entre sessions → unicité `sessionKey` | fait |
| 1.8 | Comparateur IA `/api/compare` (Anthropic) avec repli local si pas de clé | `src/lib/compare.ts`, `src/app/api/compare/route.ts`, `src/app/comparateur/page.tsx` | API optionnelle | coût API → fallback règles + quota | fait |

## P2 — Secondaire

| # | Fonctionnalité | Fichiers concernés | Dépendances | Risques | Statut |
|---|---|---|---|---|---|
| 2.1 | Sync panier connecté (persistance côté compte, serveur first sur la page) | `src/lib/actions/cart.ts`, `src/app/panier/page.tsx`, `src/app/compte/page.tsx` | — | divergence localStorage/DB → table + merge | fait |
| 2.2 | Sync favoris connecté (déjà en DB via `Favorite`) : bouton cœur maj unifié | `src/lib/actions/favorites.ts`, product-card, favorites-section | — | double source de vérité | fait |
| 2.3 | Historique prix UI : mini-graphique dans fiche produit à partir de `PriceHistory` | `src/app/produits/[slug]/page.tsx`, `src/components/price-chart.tsx` | — | aucune donnée si jamais scrapé → message | fait |
| 2.4 | Marques : page liste (`/marques`) + page `/marques/[slug]` (dérivée du champ `brand`, pas de migration forcée) | `src/app/marques/page.tsx`, `src/app/marques/[slug]/page.tsx` | — | slug de marque absent → génération à la volée | fait |
| 2.5 | Besoins (`/besoin/[slug]`) : pages éditoriales reliées à une catégorie ou mots-clés | `src/app/besoin/[slug]/page.tsx`, `src/lib/needs.ts` | — | contenu inventé → uniquement descriptif générique + produits réels | fait |
| 2.6 | Emails : templates email/tracking, retour, alerte | `src/lib/email/` | 0.3 | markdown → HTML minimal | fait |
| 2.7 | PWA : manifest, couleurs du thème, `theme-color`, icônes | `src/app/manifest.ts`, `src/app/icon.png` (générée), `next.config.*` | — | icônes absentes → SVG autogénéré | fait |
| 2.8 | Amélioration `ActivityLog` : IP, entity + filtres, pagination | `src/lib/actions/admin.ts` (logAction), `src/app/admin/(dashboard)/journal/page.tsx` | — | IP inutile derrière proxy sans `TRUSTED_PROXY` → documenté | fait |

## P3 — Cosmétique / non bloquant

| # | Fonctionnalité | Fichiers concernés | Dépendances | Risques | Statut |
|---|---|---|---|---|---|
| 3.1 | Accessibilité : focus outlines renforcés, `aria-current`, labels formulaires | composants partagés (`src/components/ui/`) | — | régression visuelle | todo |
| 3.2 | Performance : audit de bundles (`next build --analyze`), suppression N+1 résiduels | `next.config.*`, pages catalogue | — | — | todo |
| 3.3 | Bundles produit (`Bundle`/`BundleItem`) mode admin | `prisma/schema.prisma`, `src/app/admin/(dashboard)/bundles/page.tsx` | — | remise incohérente → calcul explicite | todo |
| 3.4 | i18n FR/AR + RTL : table de traduction minimale + `dir="rtl"` utility | `src/i18n/`, wrapper layout, settings | — | périmètre énorme → groundwork seulement | fait |
| 3.5 | Observable : catégories d'events (auth/order/payment/scraper/ai/database/admin/email) sans secrets | `src/lib/observability.ts` | 0.6 | fuite de données → filtrage purge | todo |

## Qualité & sortie (critères de fin §47)

- `npm run typecheck` ✅ — zéro `any`, zéro désactivation TS/ESLint.
- `npm run test` (vitest) ✅ — 63 tests (référence + nouveaux P38-P39 : statuts/tracking, livraison par ville, score qualité, synonymes/recherche, comparateur (repli factuel), alerte stock, retour validation, contexte chat).
- `npm run build` ✅ — production build Next.js.
- `npm run test:e2e` ✅ — Playwright 10 scénarios (accueil, pages pratiques, suivi, retour, comparateur, recherche, chat, connexion admin, routes protégées, rejet mauvais identifiants).
- CI/CD : `.github/workflows/ci.yml` — typecheck + tests + build + (e2e optionnel).
- Rapport final `docs/FINAL_V2_REPORT.md` — 35 sections + tableau avant/après.

## Ordre d'exécution (§44)

1. Audit (fait) → 2. Backend critique P0 → 3. Analytics P1 → 4. IA/Search P1 → 5. Scraper/qualité P1 → 6. Client P1/P2 → 7. Contenu P2/P3 → 8. PWA P2 → 9. Tests E2E/unitaires/integration → 10. CI/CD → 11. Vérification finale + rapport.