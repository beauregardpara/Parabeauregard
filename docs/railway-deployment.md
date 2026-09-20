# Déploiement Railway

Le projet est prêt à être déployé depuis GitHub avec le `Dockerfile` à la racine. Railway détecte automatiquement ce fichier et utilise `railway.json` pour vérifier `/api/health`.

## Variables Railway obligatoires

Dans le service Railway, ouvrir **Variables** et ajouter les valeurs de production :

```text
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
SESSION_SECRET=une-valeur-longue-et-aleatoire
NEXT_PUBLIC_SITE_URL=https://votre-domaine.up.railway.app
```

Ajouter aussi les variables utilisées par les services activés : Supabase Storage, Resend, Anthropic, Firecrawl et les réglages métier présents dans `.env.example`. Ne jamais copier `.env.local` ni publier de secret dans GitHub.

## Création du service

1. Railway → **New Project** → **Deploy from GitHub Repo**.
2. Choisir `beauregardpara/Parabeauregard` et la branche `main`.
3. Railway détecte le `Dockerfile` et lance le build.
4. Renseigner les variables ci-dessus avant le premier déploiement.
5. Dans **Networking**, générer un domaine public.
6. Remplacer `NEXT_PUBLIC_SITE_URL` par ce domaine puis redéployer.
7. Vérifier `https://votre-domaine.up.railway.app/api/health` : la réponse doit être HTTP 200 avec `database: "ok"`.

Le projet conserve Supabase PostgreSQL et Supabase Storage : Railway héberge l’application, pas les données existantes. Ne pas lancer `db:push` ou `db:seed` sur la base de production.
