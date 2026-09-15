# Scraper

## Sources actives

| Source | Statut | Notes |
|---|---|---|
| `mapara.ma` | ✅ actif | Connecteur + tests (`test-scraper.cjs`) |
| `phbeauty.ma` | ✅ actif | |
| `universparadiscount.ma` | ✅ actif | |
| `parapharma.ma` | ❌ retiré | Bloqué par Cloudflare (HTTP 401) |

Liste pilotée par le réglage admin `activeSources` (`src/lib/settings.ts`).

## Comportement

1. **robots.txt strict** — le domaine est téléchargé, les `Disallow` sont évalués par chemin
   (règles regroupées par `User-agent`, `$` pour fin de chemin). Une URL interdite est ignorée ;
   un domaine entièrement bloqué annule le run (statut `FAILED`).
2. **Politesse** — délai aléatoire entre requêtes (`delayMs` par connecteur), 1 connexion
   user-agent explicite.
3. **Robustesse** — `fetchHtml` retente 3× avec backoff exponentiel (1200·2ⁿ) + jitter sur
   429/5xx/520-524 et erreurs réseau (`UND_ERR_*`, `ETIMEDOUT`). Les erreurs non retryables
   (404, 401…) cassent la boucle immédiatement.
4. **Parcours** — `listUrls` multi-pages limitées par `maxProductsPerRun`.
5. **Transformation** — `parseProduct` (cheerio) par connecteur → `RawProduct`. Le prix passe
   par `parseMoroccanPrice` (supporte `1 299,00 DH`, `1.299,00`, `129.90 MAD`, `99 dh`).
   La disponibilité via `detectAvailability`. **Aucun prix/stock inventé.**
6. **Écriture transactionnelle** — `upsertProduct` :
   - nouveau produit → `PENDING_REVIEW` (ou `PUBLISHED` si auto-publish) ;
   - produit existant → prix mis à jour seulement si réellement différent, avec
     `PriceHistory` (before/after) ; stock pareil avec `StockChange` + `StockHistory` ;
   - honnêteté stock : « en stock » → `unlimitedStock=true` (stock conservé),
     « en rupture » → `unlimitedStock=false`, `stock=0` ; produits illimités ne génèrent pas
     d'écriture de stock.
7. **Images** — téléchargées dans `public/uploads/scraped/` (nom haché côté source), URL
   relatives stockées en base ; re-crawl sans re-téléchargement inutile.
8. **Journal** — un `ScrapeRun` par exécution (durée, statut, compteurs new/updated/failed,
   erreurs), insecté depuis l'admin.

## Lancement

```bash
npm run scrape                  # toutes les sources actives
npm run scrape -- --source=mapara.ma
npm run scrape -- --source=mapara.ma --auto   # override auto-publish
npm run scrape:schedule         # boucle selon le réglage scrape_frequency_hours (défaut 6 h)
```

`auto_publish` (réglage admin) décide si les nouveaux produits sont publiés automatiquement ou
mis en file de validation. La route `POST /api/admin/scrape` exécute une source (RBAC
`scraper:write`, rate-limit). `schedule-scrape.ts` ne démarre pas une source déjà en cours
(RUNNING).

## Tests

`tests/scraper.test.ts` couvre `parseMoroccanPrice` et `detectAvailability`.
`test-scraper.cjs` est un script manuel contre `mapara.ma` (peut être exécuté directement :
`node test-scraper.cjs`).