# Sauvegarde et restauration

## Base SQLite de développement

Arrêter les écritures, copier `prisma/dev.db` et conserver la date de sauvegarde. Ne pas copier le fichier dans une archive publique.

```powershell
Copy-Item prisma/dev.db backups/dev.db.$(Get-Date -Format yyyyMMdd-HHmmss)
```

## Base PostgreSQL de production

Utiliser `pg_dump` avec une connexion gérée hors du dépôt et chiffrer le fichier de sauvegarde. Tester périodiquement `pg_restore` dans un environnement isolé.

## Archive applicative

L’archive de livraison doit exclure `node_modules`, `.next`, `.env*`, les logs, les caches, les bases locales et les anciens artefacts. Elle doit inclure le code source, Prisma, `public`, les tests, scripts, package files et la documentation.

## Restauration

1. Déployer l’archive versionnée.
2. Restaurer la base correspondante.
3. Renseigner les variables d’environnement.
4. Exécuter `npm ci`, `npm run build` et le smoke test standalone.
5. Vérifier `/api/health`, l’admin et la création d’une commande de test en paiement à la livraison.

## Rollback

Revenir à l’archive et à la sauvegarde DB du même point de version. Ne jamais restaurer une base plus récente sur un code ancien sans vérifier les migrations.
