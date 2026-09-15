# TESTING — V2.1 (THIQTI.MA)

Comment exécuter et que couvre la suite. Chiffres relevés sur le run V2.1.

## 1. Commandes

| Commande | Portée | Résultat V2.1 |
|---|---|---|
| `npm test` | tests unitaires vitest (Node) | **76 tests, 6 fichiers — OK** |
| `npm run test:e2e` | Playwright chromium + mobile (iPhone 12) | **24 tests — OK** |
| `npm run test:all` | lint + typecheck + test + build | OK (gates complets) |

> *e2e nécessite d'abord `npm run build` (le webServer démarre `npm run start`).

## 2. Tests unitaires — `tests/` (76)

Fichiers existants :
- `tests/auth.test.ts` — sessions client/admin, RBAC, expirations, login.
- `tests/core.test.ts` — parser prix scraper, schémas Zod, `parseNeed`, format.
- `tests/v2-core.test.ts` — non-régression cœur (quantités, tokens, W3borders, checkout basique).
- `tests/v2-1-regression.test.ts` — **nouveau V2.1** (13 tests) :
  - **SSRF** : `isBlockedHost` contre loopback, RFC1918, APIPA, CGNAT, IPv6, `.local`/`.internal` ;
    hôtes publics autorisés.
  - **Rate-limit anti-spoofing** : `X-Forwarded-For` ignoré sans `TRUSTED_PROXY`,
    fenêtre glissante (`maxRequests`), isolation par IP, configurations prédéfinies.
  - **Emails anti-XSS** : `esc()` échappe `<script>`, `onerror`, `'&<>`, `"` dans toutes les
    variantes (`order-status`, `order-confirmation`, `return-*`, `stock-alert`).
  - **Logger structuré** : JSON-lines avec champs attendus, **redaction des secrets**
    (aucune clé/mot de passe en clair dans la sortie), respect de `LOG_LEVEL`.

## 3. E2E — `e2e/` (24)

Deux projets Playwright (config `playwright.config.ts`) :
- **`chromium`** (desktop) — 19 tests : store public, admin (login + redirection + rejet
  identifiants), **axe-core** (niveau A) sur accueil, recherche, fiche produit, admin login,
  interactions clavier (Escape ferme panier/chat), non-régression API/headers.
- **`mobile-iphone`** — 5 tests (iPhone 12, chromium) : bottom-nav + panier, menu mobile,
  barre sticky produit, drawer filtres (Escape + `inert`), assistant.

Fichiers :
- `e2e/store.spec.ts` : pages publiques, suivi commande, retour, comparateur, recherche, chat.
- `e2e/admin.spec.ts` : login accessible, pages internes exigent session, rejet identifiants.
- `e2e/a11y.spec.ts` : **axe-core `wcag2a`/`wcag21a`** sur 4 pages + Escape/inert des dialogues.
- `e2e/mobile.spec.ts` : parcours mobile.
- `e2e/nonregression.spec.ts` : `/api/health` (version, pas de secret), headers de sécurité (CSP
  `img-src 'self' https: …`, `frame-ancestors 'none'`, `X-Content-Type-Options`), pas de `<script>`
  reflété dans la recherche.

## 4. Choix techniques et écueils documentés
- **`inert` HTML** : React pose l'attribut `inert=""` (autovaleur) — les assertions Playwright
  vérifient `toHaveAttribute("inert", "")`.
- **Clics mobile** : l'émulation iPhone 12 (via chromium) a des divergences de hit-test sur les
  éléments fixed → `{ force: true }` sur les boutons de navigation mobile.
- **axe** : seules les règles **A** sont exigées (le contraste AA est traité en UI mais reste
  vulnérable aux palettes admin) ; résultats sérialisés dans le message d'échec pour faciliter le debug.
- **Vitest** : alias `server-only`/`next/headers` simulés (`tests/mocks/`), env initialisé dans
  `tests/setup.ts`.

## 5. Non couvert / limites (honnête)
- Aucune vraie passerelle de paiement CMI (simulée) — à réserver pour la mise en prod réelle.
- Les tests e2e exigent un catalogue peuplé (SQLite de dév) ; en CI PostgreSQL, le fixture
  est créée par `db:push` + données répliquées en cours de run (jamais des données réelles).
- Le contraste des couleurs (AA) n'est pas une porte de sortie de la CI (tags A uniquement).