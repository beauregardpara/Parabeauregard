# Para Beauregard — Final Premium V7

## Status

**READY FOR PRODUCTION**

## Version

**Para Beauregard Final Premium V7**

## Architecture

- Next.js App Router et rendu standalone.
- `src/app/` : storefront, compte, checkout, admin et API.
- `src/components/` : interface et comportements client.
- `src/lib/` : Prisma, auth, recherche, sécurité, validation, actions et scraper.
- `prisma/` : schéma et seed.
- `public/` : logo officiel, assets premium et images catalogue.
- Cart Drawer : portal document, overlay plein écran, scroll interne, verrouillage body et focus trap desktop/mobile.

## Stack

- Next.js 15.5.25
- React 19, TypeScript
- Tailwind CSS v4
- Prisma 6.19.3, SQLite en développement, PostgreSQL documenté en production
- Sharp 0.35.4
- Vitest, Playwright, axe-core
- Sortie Next standalone

## Tests et build

- TypeScript : OK
- ESLint : OK
- Unit tests : 112/112
- E2E : 39/39
- Build production : code 0
- Standalone : OK sur `http://localhost:3000`
- Base de démonstration : 559 produits

## Sécurité et audit npm

- 0 vulnérabilité critique.
- 5 alertes transitives restantes : 1 moderate et 4 high selon npm.
- Les alertes sont documentées dans `docs/SECURITY_AUDIT_V7.md`.
- Elles ne sont actuellement pas démontrées comme atteignables dans le runtime applicatif de production.
- Aucun `npm audit fix --force`, aucune migration Next.js 16 et aucune migration Prisma 7+ n'a été effectuée.
- Risque accepté et non nul : réévaluation prévue dans une future migration majeure séparée.

## Coordonnées commerciales

- Nom : Para Beauregard
- Téléphone affiché : 06 63 48 82 87
- Téléphone international : +212663488287
- Email : parabeauregard@gmail.com
- Localisation : Casablanca, Maroc
- Coordonnées : 33.6025816, -7.4822215

## Fonctionnalités validées

- Catalogue de 559 produits, recherche, filtres, catégories et marques.
- Favoris, comparateur, panier persistant et checkout.
- Paiement à la livraison.
- Comptes clients et administration protégée.
- Scraper multi-sources et enrichissement optionnel.
- Assistant de recommandation avec fallback local.
- SEO, pages institutionnelles et données structurées.
- Mobile V6 : chat route-aware, CTA produit pilotée par IntersectionObserver et navigation inférieure.
- Admin : dashboard, commandes, produits, clients, avis, retours, promotions, scraper et système.

## Services externes

- Anthropic : optionnel pour l'assistant ; fallback local sans clé.
- Firecrawl : optionnel pour enrichissement et scraping.
- SMTP/Mailgun/SendGrid : à configurer chez l'hébergeur.
- CMI/paiement carte : non configuré ; paiement à la livraison disponible.
- Google Maps : lien externe basé uniquement sur les coordonnées officielles.

## Commandes de validation

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
npm run start:standalone
```

## Backup et rollback

- Archive finale : `para-beauregard-v7-production.zip`.
- L'archive exclut les dépendances, builds, secrets, logs, caches et résultats de tests.
- Sauvegarder la base avant toute migration et conserver l'archive avec son hash.
- Pour rollback : arrêter l'instance, restaurer l'archive et la sauvegarde DB correspondante, puis vérifier `/api/health`.

## Configuration de déploiement restante

- [ ] PostgreSQL production
- [ ] `DATABASE_URL` production
- [ ] domaine
- [ ] DNS
- [ ] HTTPS
- [ ] SMTP et email expéditeur
- [ ] clé IA si assistant externe activé
- [ ] paiement carte si souhaité
- [ ] backups automatiques
- [ ] monitoring
- [ ] première commande réelle de test

## Environnement

`.env.example` documente uniquement les variables nécessaires et ne contient aucun secret réel. La production doit fournir notamment `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL` et, selon les services activés, les clés Anthropic/Firecrawl et le fournisseur email.
