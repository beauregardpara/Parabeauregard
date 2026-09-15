# Para Beauregard — état de préparation public

## Application

- UI premium et assets restaurés conservés
- Cart Drawer et comportement mobile V6 conservés
- Catalogue : 559 produits
- Réputation web Firecrawl : server-side, admin-only, mise en cache TTL 7 jours
- Assistant, panier, checkout, auth et admin validés sans appel Firecrawl au rendu public

## Validation locale

- TypeScript : OK
- ESLint : OK
- Unit : 118/118
- E2E : 41/41
- Build production : code 0
- Standalone : routes publiques, health et asset premium vérifiés
- Test Firecrawl manuel : 1 recherche, 3 résultats publics

## Sécurité

`FIRECRAWL_API_KEY` reste une variable serveur dans `.env`. Elle n’est pas présente dans `.env.example`, le bundle client ou les journaux. Les routes de réputation sont protégées par session admin, RBAC et rate-limit. Les URLs privées et schémas dangereux sont refusés.

## Configuration externe restante

PostgreSQL production, `DATABASE_URL`, domaine/DNS/HTTPS, SMTP, monitoring, backups/restauration et première commande réelle restent à configurer et valider par l’hébergeur. Le paiement carte demeure désactivé tant qu’aucun provider réel n’est certifié.

## Verdict

**APPLICATION READY — DEPLOYMENT CONFIGURATION REQUIRED**
