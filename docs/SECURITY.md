# SECURITY — V2.1 (THIQTI.MA)

Posture de sécurité appliquée et vérifiée. Chaque mesure est soit **testée**
(tests vitest / e2e) soit **vérifiée au code**.

## 1. Authentification & sessions
- **Mots de passe** : `scrypt` avec sel par utilisateur (`src/lib/auth.ts`), jamais stockés en clair.
- **Sessions** : cookie signé HMAC-SHA256 (`SESSION_SECRET`, clé requise au boot — l'app refuse
  de démarrer sans), détection de `Session-Id` expiré, renvoi vers `/admin/login`.
- **Anti-énumération** : message unifié « identifiants incorrects » + délai constant.
- **Admin** : protection middleware sur `/admin/**` + double garde RBAC dans chaque Server Action
  (`hasPermission("scraper:write")`, etc.) et chaque route API (ex. `/api/admin/scrape`).

## 2. Injection & données
- **XSS** : toutes les données utilisateur dans les emails sont échappées (`esc()` dans
  `src/lib/email/templates.ts`, vérifié par tests sur `<script>`, `onerror`, `'&<>`).
- **Zod** : tous les formulaires (commande, contact, compte, admin) sont validés côté serveur
  (schémas dans `src/lib/validation/`).
- **Requêtes** : Prisma (paramètres préparés) — aucune concaténation SQL.

## 3. Plateau technique & proxy
- **SSRF** : `src/lib/scraper/http.ts` bloque loopback, RFC1918, APIPA (169.254), CGNAT
  (100.64/10), IPv6 link-local/ULA, noms `.local`/`.internal`/`.localhost` — appliqué à
  `downloadImage` et à l'ingestion des images `searchProductImages`. Testé (6 assertions).
- **Rate-limit par IP** : fenêtre glissante en mémoire (`src/lib/security/rate-limit.ts`).
  `X-Forwarded-For`/`X-Real-IP` ne sont lus **que si `TRUSTED_PROXY=true`**, sinon clé
  globale — anti-spoofing testé.
- **Limites** : login 5/5 min, chat 10/min, création commande 3/h, actions admin 30/min.

## 4. HTTP & en-têtes
Appliqués à toutes les routes (`next.config.ts`):
- `Content-Security-Policy` : `default-src 'self'` ; `img-src 'self' https: data: blob:` ;
  `frame-ancestors 'none'` ; `base-uri 'self'` ; `form-action 'self'`. Vérifié par e2e.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `Permissions-Policy` restreinte, `poweredByHeader: false`.
- `Strict-Transport-Security` (prod uniquement, max-age 2 ans + preload).
- API : `Cache-Control: no-store` sur `/api/:path*`.

## 5. Secrets & observabilité
- **/api/health** n'expose jamais de valeur sensible ; le logger JSON redacte
  (`passwordHash`, clés, tokens) — testé (aucun secret dans le JSON).
- `.env.example` ne contient que des placeholders ; `.env` exclu via `.gitignore` ; `.dockerignore`
  exclut `.env*` de l'image.
- Le mode `--experimental-print-config` (print du SENTRY) **ne s'exécute pas en production**
  (garde `NODE_ENV`), conforme à l'exigence « ne jamais rejouer les secrets lus ».

## 6. Exigences « rebond »
- **Anti-scraping public** : les pages de navigation (recherche/résultats) sont servies sur
  demande, le formulaire de contact rate-limité, aucune liste brute exposée (catalogue paginé admin).
- **Anti-énumération emails/mots de passe** : message unifié > interception, confirmé par e2e.
- **Aucune donnée réelle** n'a été introduite : le catalogue est un jeu de démonstration
  (voir `docs/FINAL_PRODUCTION_REPORT.md` pour le plan de mise en vraie prod).

## 7. Audit de dépendances
`npm audit` : 6 « high », toutes transitives (`deepmerge-ts` via CLI Prisma, `postcss`/`sharp`
via Next), corrigeables uniquement par `next@16` (breaking). Aucune exploitables au runtime de
ce storefront. Détaillé et assumé dans `docs/BUNDLE_AUDIT.md`.

## 8. Actions recommandées avant mise en production réelle (hors périmètre V2.1)
1. Passe à **PostgreSQL** (`docs/POSTGRESQL.md`) et migration du stockage images (R2/S3).
2. HTTPS/TLS obligatoire + placer derrière un reverse proxy **fiable** puis `TRUSTED_PROXY=true`.
3. Vérifier/auditer le CMI (passerelle de paiement) réel — la passerelle actuelle est simulée.
4. Sauvegardes automatiques de la base + surveillance (Sentry avec `NEXT_PUBLIC_SENTRY_DSN` défini).