# Rollback production — Para Beauregard

## Principes

- Stopper la promotion du déploiement concerné et conserver les logs associés.
- Ne jamais supprimer la base de production pour revenir en arrière.
- Les migrations Prisma de production sont traitées comme forward-only : une migration déjà appliquée n'est pas annulée par une commande destructive improvisée.
- Toute restauration de données doit être précédée d'une vérification du fichier de sauvegarde et d'une validation du périmètre restauré.
- Ne jamais consigner ni afficher `DATABASE_URL`, les mots de passe ou les clés API.

## Rollback applicatif

1. Identifier le commit ou l'image actuellement déployé(e) et le dernier artefact validé.
2. Redéployer cet artefact connu comme sain avec les mêmes variables d'environnement de production.
3. Vérifier `/api/health`, la connexion client, le panier, le checkout COD et la connexion admin.
4. Contrôler les logs, les erreurs serveur et les métriques de requêtes avant de rouvrir le trafic.

## Rollback de données

Pour une erreur de données, prendre d'abord une sauvegarde de l'état courant. Restaurer ensuite une sauvegarde PostgreSQL vérifiée dans une base isolée, comparer les comptes et tester l'application contre cette copie avant toute bascule.

Commandes de référence :

```text
pg_dump --format=custom --file=para-beauregard-YYYYMMDD-HHMM.dump "$DATABASE_URL"
createdb para_beauregard_restore_test
pg_restore --clean --if-exists --no-owner --dbname="$RESTORE_DATABASE_URL" para-beauregard-YYYYMMDD-HHMM.dump
```

La variable `RESTORE_DATABASE_URL` doit viser une base de restauration isolée, jamais la base active. La procédure complète et la politique de rétention sont décrites dans `docs/POSTGRES_BACKUP.md`. Au moment de la préparation Go-Live, la restauration PostgreSQL n'est pas encore testée faute d'instance PostgreSQL configurée.

## Après rollback

- Rejouer la suite TypeScript, ESLint, unit, E2E et build.
- Vérifier les assets premium, le Cart Drawer, le comportement Mobile V6 et `/api/health`.
- Documenter la cause, l'artefact retenu, les migrations concernées et les résultats de validation.
