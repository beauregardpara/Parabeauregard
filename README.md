# Para Beauregard 🌿

Plateforme e-commerce complète pour parapharmacie marocaine — 4 modules :

1. **Scraper automatisé** multi-sources (mapara.ma, phbeauty.ma, universparadiscount.ma)
2. **Boutique publique** avec effets 3D pro (Next.js 15 + React 19 + Tailwind v4)
3. **Panneau admin** complet (produits, commandes, clients, avis, coupons, scraper, journal)
4. **Assistant IA** de recommandation produits (Claude / Anthropic)

---

## 🚀 Installation

```bash
npm install          # installe les dépendances + génère le client Prisma
npx prisma db push   # crée la base SQLite (prisma/dev.db)  ← déjà fait
npm run db:seed      # jeu de données réaliste (48 produits…)   ← déjà fait
npm run dev          # http://localhost:3000
```

### Variable d'environnement (`.env` — voir `.env.example`)

| Clé | Rôle |
|---|---|
| `DATABASE_URL` | Base SQLite locale (`file:./dev.db`) ou PostgreSQL en prod |
| `SESSION_SECRET` | Signature HMAC des cookies de session (obligatoire) |
| `ANTHROPIC_API_KEY` | *(optionnel)* active l'IA du chatbot — sinon fallback recherche locale par mots-clés |
| `ANTHROPIC_MODEL` | *(optionnel)* modèle IA, défaut `claude-sonnet-4-5` |
| `TRUSTED_PROXY` | *(optionnel)* `true` uniquement derrière un reverse proxy fiable (rend le rate-limit par IP efficace) |
| `NEXT_PUBLIC_SITE_URL` | URL publique (métadonnées, sitemap, robots) |

---

## 🔑 Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Super Admin | `admin@parabeauregard.ma` | `admin123` |
| Gestionnaire catalogue | `gestionnaire@parabeauregard.ma` | `gestion123` |
| Service commandes | `commandes@parabeauregard.ma` | `commandes123` |
| Client | `client@demo.ma` | `client123` |

Coupons : `BIENVENUE10` (-10 %), `SOLAIRE20` (-20 % solaire), `MOINS29` (-29 DH).

---

## ✅ Portes de sortie (V2.1 — Prêt production)

```bash
npm run lint          # ESLint 9 : 0 erreur (warnings documentés)
npm run typecheck     # tsc --noEmit
npm test              # vitest : 76 tests
npm run build         # Next standalone (output: standalone) — voir Dockerfile
npm run test:e2e      # Playwright : 24 tests (desktop + mobile iPhone 12 + axe-core)
npm run test:all      # lint → typecheck → test → build
```

Détails : `docs/TESTING.md`, `docs/FINAL_PRODUCTION_REPORT.md`, `docs/BUNDLE_AUDIT.md`,
`docs/SECURITY.md`, `docs/DEPLOYMENT.md`. CI GitHub Actions complète (qa / e2e / docker).

---

## 📦 Scripts

```bash
npm run dev                # serveur de développement
npm run build              # build production (génère Prisma Client avant)
npm run start              # serveur production
npm run typecheck          # vérification TypeScript stricte
npm test                   # tests unitaires (vitest)

npm run db:seed            # réinitialise et remplit la base de données
npx prisma studio          # explorateur visuel de la base
npm run images:swap        # bascule la base vers vos .png générés par IA (voir GEMINI-PHOTOS.md)
node scripts/check-images.mjs  # vérifie que chaque image référencée en base existe sur disque

# Scraper
npm run scrape -- --source=mapara.ma           # une source → file d'attente admin
npm run scrape -- --source=mapara.ma --auto    # publication automatique (outrepasse le réglage admin)
npm run scrape                                 # toutes les sources actives
npm run scrape:schedule                        # boucle planifiée (fréquence: réglage admin, défaut 6 h)
```

Le scraper respecte les `robots.txt` (règles `Disallow` évaluées par chemin), espace les requêtes,
retente 3× avec backoff exponentiel + jitter sur erreurs 429/5xx et erreurs réseau, télécharge les
images localement (`public/uploads/scraped/`), enregistre l'historique des prix/stocks (valeurs
avant/après réelles), et dépose les nouveaux produits **en attente de validation** (sauf si le
réglage `auto_publish` est activé). Une garde anti-double exécution empêche deux runs simultanés
par source. **Stock honnête** : une source n'ayant pas de quantité, un produit « en stock » passe
en stock illimité, un produit « en rupture » passe à `stock=0`.

---

## 🗺️ Pages principales

| Route | Description |
|---|---|
| `/` | Accueil 3D : hero parallaxe, best-sellers, nouveautés, promos, marques |
| `/categories/[slug]` · `/nouveautes` · `/promotions` · `/recherche` | Listings avec filtres (prix, marque, note) + tri + pagination |
| `/produits/[slug]` | Fiche produit : galerie zoom, avis, quantité, JSON-LD SEO |
| `/panier` · `/commander` · `/commande/[reference]` | Panier persistant (localStorage), checkout paiement à la livraison (CMI simulé) ; suivi de commande sécurisé par lien privé ou `?token=` unique |
| `/compte` (+ connexion / inscription) | Espace client : commandes, adresses |
| `/api/search` · `/api/chat` | Suggestions instantanées · Assistant IA |
| `/admin/*` | Tableau de bord protégé par session (voir modules ci-dessous) |

Pages institutionnelles : `/a-propos`, `/livraison-retours`, `/faq`, `/contact`, CGV, mentions légales, confidentialité.

---

## 🛡️ Admin (`/admin`)

- **Dashboard** : CA total, CA du mois, commandes du mois, panier moyen, commandes à valider, ruptures.
- **Produits** : filtres statut/source/recherche, pagination (25/page), actions groupées (publier, masquer, supprimer), éditeur complet (prix, promo, stock, catégorie, images, description) + historiques prix/stock.
- **Commandes** : suivi des statuts (Reçue → Préparation → Expédiée → Livrée / Annulée) avec **confirmation avant annulation** (le stock et les points fidélité sont restitués), pagination (30/page), facture imprimable.
- **Clients** : recherche (nom/email), pagination (30/page), CA généré (commandes non annulées), points fidélité.
- **Coupons** : en pourcentage ou montant fixe, avec plage de validité optionnelle (début/fin).
- **Utilisateurs** (rôles SUPER_ADMIN / CATALOG_MANAGER / ORDER_MANAGER) · **Journal d'activité**.
- **Scraper** : lancement manuel par source, journal des exécutions, file de validation des produits importés, réglages (fréquence, auto-publish).

Toutes les mutations admin sont gardées par session et tracées dans le journal.

---

## 🤖 Assistant IA

Widget flottant sur tout le site. Le modèle Claude reçoit un prompt strict (ne jamais inventer de produit/prix)
et appelle l'outil `rechercher_produits` qui interroge la base (budget, marque, catégorie, mot-clé).
Réponse limitée à 4 produits réels avec prix exacts. Sans clé API, un moteur local de scoring par mots-clés prend le relais.

---

## 🏗️ Architecture

```
src/
├── app/                  # App Router (pages publiques, admin, API)
├── components/           # UI (hero 3D, header glass, cartes tilt, chat widget, bottom-nav…)
├── lib/
│   ├── auth.ts           # scrypt + cookies HMAC signés (client & admin)
│   ├── db.ts             # singleton Prisma
│   ├── search.ts         # moteur de filtrage/tri/pagination
│   ├── chat.ts           # matching produits pour l'IA (budget, fourchette, mots-clés)
│   ├── settings.ts       # paramètres applicatifs (livraison, fidélité, scraper)
│   ├── security/         # rate-limiting par IP (route handlers + server actions)
│   ├── validation/       # schémas Zod partagés
│   ├── scraper/          # types, http poli (robots + retries), connecteurs ×3, engine
│   └── actions/          # Server Actions (commandes, comptes, admin)
└── scripts/              # CLI scraper + scheduler

prisma/schema.prisma      # 20+ modèles (produits, historiques, commandes, chat…) + index
tests/                    # tests vitest (auth/session, parser prix, schémas, parseNeed)
public/products/*.svg     # illustrations cohérentes du catalogue de démo
```

**Design** : palette verte `brand` + menthe/corail, Tailwind v4 (`@theme` dans `globals.css`),
effets 3D CSS purs (perspective, tilt souris, shine, floaty, marquee, reveal au scroll),
respect de `prefers-reduced-motion`, focus visible global, navigation mobile en bas d'écran
(bottom nav + panier dans un tiroir) et lightbox galerie accessible (zoom, clavier).

> ⚠️ Projet de démonstration : passerelle CMI simulée. Le durcissement de base est en place
> (sessions signées scrypt+HMAC, rate-limiting par IP sur `TRUSTED_PROXY`, anti-énumération à la
> connexion, accès commande par token, schémas Zod, journaux admin). Aucune donnée réelle ne doit
> être utilisée en production sans audit final (HTTPS, sauvegardes, CMI réel…).
