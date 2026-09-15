# Installation locale

## Prérequis

- Node.js 22 LTS recommandé
- npm
- SQLite pour le développement local

## Installation

```bash
npm install
Copy-Item .env.example .env.local
npx prisma db push
npm run db:seed
npm run dev
```

Le site est disponible sur `http://localhost:3000`.

## Variables essentielles

Renseigner au minimum `DATABASE_URL`, `SESSION_SECRET` et `NEXT_PUBLIC_SITE_URL`. Les clés Anthropic, Firecrawl, SMTP et monitoring sont optionnelles et ne doivent jamais être exposées au navigateur.

## Vérifications

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

## Standalone local

Après le build, lancer `npm run start:standalone` avec une `DATABASE_URL` valide. Vérifier `/`, `/recherche?q=creme`, une catégorie, un produit, `/panier`, `/commander`, `/compte/connexion`, `/admin/login` et `/api/health`.
