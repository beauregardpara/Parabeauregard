# Déploiement — Para Beauregard

## Flux standard

```
branche → pull request → CI verte → merge sur main → déploiement Vercel automatique
```

- Dépôt GitHub privé `medvoyage888-lgtm/para-beauregard`, relié au projet Vercel
  existant `para-beauregard` : tout commit sur `main` part en production.
- Ne jamais pousser directement sur `main` ; ne jamais créer un second projet Vercel.
- Vérifications après déploiement : `/api/health` (status, database, version,
  `counts.products`), une fiche produit, le panier, le checkout, l'administration.
- Versions : `APP_VERSION` (variable Vercel) doit correspondre au tag livré.
  Correctifs → `v1.0.x`, évolutions → `v1.x.0`. Les tags ne sont jamais réécrits.

## Contrôles CI (`.github/workflows/ci.yml`)

| Job | Contenu |
| --- | --- |
| qa | ESLint, TypeScript, tests unitaires (Vitest), build |
| e2e | PostgreSQL 16 + catalogue synthétique, Playwright (bureau, mobile, accessibilité) |
| docker | Image standalone + smoke test (santé, pages clés) |

Commandes locales équivalentes :

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Variables d'environnement (Vercel)

Noms seulement — les valeurs ne sont jamais copiées dans le dépôt.

| Clé | Rôle |
| --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | PostgreSQL Supabase (pool et connexion directe) |
| `SESSION_SECRET` | Signature des sessions et des liens de réinitialisation |
| `NEXT_PUBLIC_SITE_URL` | URL publique (canonical, sitemap, emails) |
| `APP_VERSION` | Version affichée par `/api/health` |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PRODUCT_IMAGES_BUCKET` | Images produits (clé serveur uniquement) |
| `RESEND_API_KEY`, `RESEND_FROM` | Emails transactionnels |
| `BUSINESS_NOTIFICATION_EMAIL` | Facultatif : destinataire des notifications internes (défaut : email public) |
| `FIRECRAWL_API_KEY`, `REPUTATION_*` | Scraper et réputation (appels payants) |
| `TRUSTED_PROXY` | Facultatif hors Vercel ; sur Vercel les en-têtes d'IP sont fiables d'office |

Sur Vercel, le limiteur de débit utilise l'IP transmise par la plateforme
(`x-vercel-forwarded-for`) : chaque visiteur a sa propre limite.

## Surveillance et sauvegardes

- `production-health.yml` : contrôle `/api/health` toutes les 3 heures (variables
  GitHub facultatives `PRODUCTION_HEALTH_URL`, `PRODUCTION_MIN_PRODUCTS`,
  `PRODUCTION_EXPECTED_VERSION`).
- `database-backup.yml` : sauvegarde base + stockage chaque nuit, restauration testée
  dans une base isolée, artefacts privés 14 jours.

Incidents et retours arrière : `docs/PRODUCTION-RUNBOOK.md`.
Exploitation quotidienne : `docs/ADMIN-OPERATIONS.md`.
