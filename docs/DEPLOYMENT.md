# DEPLOYMENT — V2.1 (THIQTI.MA)

Guide de déploiement production. Retient exactement ce qui est testé dans la CI.

## 1. Builds requis (gates)
```bash
npm ci                        # install propre (lockfile)
npm run lint                  # 0 error (perte tolérable : warnings documentés)
npm run typecheck             # tsc --noEmit
npm test                      # vitest : 76 tests, 6 fichiers
npm run db:push               # crée le schéma (SQLite local / PG en prod)
npm run build                 # prisma generate && next build (standalone)
npm run test:e2e              # playwright : 24 tests (projets chromium + mobile-iphone)
```

## 2. Sortie standalone (image Docker)

`next.config.ts` exporte `output: "standalone"`. Le Dockerfile (multi-étapes, user non-root)
produit une image minimale :

```dockerfile
# via CI (npm * pas encore installé sur la machine de déploiement ? Sinon :)
docker build -t thiqti-ma .
docker run -d -p 3000:3000 \
  -e DATABASE_URL="file:./data/prod.db" \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  thiqti-ma
```

- **Healthcheck** : `GET /api/health` → 200 (DB OK) / 503 (DB KO), version incluse.
- **DB SQLite** : le dossier `/app/data` du conteneur est pré-créé et inscriptible par
  l'utilisateur non-root `nextjs` (le smoke test CI s'appuie dessus).
- **Volumes** : monter un volume sur `/app/data` pour persister SQLite.

## 3. Variables d'environnement (voir `.env.example`)

| Clé | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | `file:…` (SQLite) ou `postgresql://…` (prod) |
| `SESSION_SECRET` | oui | signature HMAC des sessions (32+ octets aléatoires) |
| `NEXT_PUBLIC_SITE_URL` | oui | métadonnées/canonical/sitemap/robots |
| `ANTHROPIC_API_KEY` | non | assistant IA Claude (sinon fallback local) |
| `TRUSTED_PROXY` | non | `true` uniquement derrière un reverse proxy fiable |
| `LOG_LEVEL` | non | `debug`/`info`/`warn`/`error` (défaut `info`) |
| `ALLOW_SEED_IN_PROD` | non | autorise explicitement `db:seed` en `NODE_ENV=production` |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` | non | monitoring (intégration optionnelle dans le logger) |
| `APP_VERSION` | non | surcharge la version affichée par `/api/health` |

## 4. Mise en production recommandée

1. **PostgreSQL** : voir `docs/POSTGRESQL.md` (Aïna de host à la base, run migrations `db:push`/`migrate`).
2. **Reverse proxy** : Nginx/Traefik/CF en HTTPS ; définir `TRUSTED_PROXY=true` ET filtrer
   `X-Forwarded-For` côté proxy (impératif pour le rate-limit par IP).
3. **Images** : les 52 MB de `public/` peuvent être servis depuis un object storage
   (allège l'image ~134→135 MB ; garder `images.unoptimized`).
4. **Horodatage/scheduler scraping** : `npm run scrape:schedule` via cron/système (voir
   `docs/SCRAPER.md`); l'admin peut déclencher manuellement via `/admin/scraper`.

## 5. CI (`.github/workflows/ci.yml`)
- **qa** : lint + typecheck + vitest + db:push + build (Node 22, timeout 25 min). Attiser
  `node-version: 22` : sous **Node ≥ 23/24 le build webpack peut crasher** `WasmHash` —
  corrigé côté app par `webpack.output.hashFunction = "sha256"` dans `next.config.ts`.
- **e2e** : services Postgres 16, Playwright chromium + mobile (iPhone 12) + axe-core
  (timeout 40 min).
- **docker** : `docker/build-push-action@v6` + smoke test `GET /api/health`
  (`DATABASE_URL="file:./data/ci.db"`, script dispos en fin de job).

## 6. Notes d'exploitation
- **Mode prod = SQLite interdit de seed** : `prisma/seed.ts` refuse `NODE_ENV=production`
  sans `ALLOW_SEED_IN_PROD=true`.
- Résilience : le scraper retries + robots.txt, le chat est rate-limité (10/min), les actions
  admin auditées (`PrismaActivityLog`), journal en base de toutes les mutations.
- Le build local est légèrement **différent de la CI** (Linux/Node 22 vs Windows/Node 24) — le
  fix WASM-hash s'applique aux deux.