# Migration SQLite → PostgreSQL

## Périmètre

Migration de la base locale SQLite vers PostgreSQL Supabase, sans modification du design, des assets premium, du Cart Drawer ou du comportement Mobile V6.

Date d’exécution : 12 septembre 2026.

## Procédure appliquée

1. Sauvegarde SQLite vérifiée avant toute écriture.
2. Schéma PostgreSQL généré depuis le schéma Prisma existant, sans `db push --force-reset` et sans suppression de tables.
3. Migration initiale appliquée par `prisma migrate deploy`.
4. Export SQLite puis import relationnel explicite, avec conservation des identifiants historiques.
5. Séquences PostgreSQL resynchronisées après import.
6. Contrôles de comptage et d’intégrité relationnelle exécutés.

La procédure de données est relançable via `npm run db:migrate:data`. Elle exige une confirmation explicite et utilise les identifiants historiques ; elle ne doit pas être relancée sur une base déjà peuplée sans procédure de sauvegarde et de vérification préalable.

## Comptages

| Entité | SQLite avant | PostgreSQL après import |
| --- | ---: | ---: |
| Produits | 559 | 559 |
| Catégories | 15 | 15 |
| Images produit | 1340 | 1340 |
| Clients | 2 | 2 |
| Commandes avant test COD | 2 | 2 |
| Commandes après test COD contrôlé | — | 3 |
| Articles de commande après test COD | — | 5 |
| Promotions/coupons | 3 | 3 |
| Favoris | 0 | 0 |
| Analyses de réputation | 0 | 3 |

Les 3 analyses de réputation et la commande supplémentaire sont des données de validation explicitement créées après l’import initial.

## Qualité et intégrité

- Images manquantes : 0
- Prix invalides : 0
- Stocks négatifs : 0
- Slugs dupliqués : 0
- Marques manquantes : 0
- Orphelins média : 0
- Orphelins d’articles de commande : 0
- Descriptions manquantes connues : 13, conservées sans invention
- SKU dupliqué connu : `Référence8436616355180`, produits historiques 1220 et 1233, conservé sans invention

## Réputation Firecrawl

Trois produits ont été analysés manuellement, conformément à la limite de validation. Seize sources ont été persistées dans PostgreSQL. Les rechargements des fiches lisent le cache persistant et ne déclenchent pas de nouvelle requête Firecrawl.

## Commande COD de validation

Une commande COD contrôlée a été créée sur PostgreSQL. Le total vérifié côté serveur est de 192 DH, composé d’un sous-total de 163 DH et de 29 DH de livraison. La vérification directe dans l’interface d’administration avec un compte de production n’a pas été effectuée.

## Sauvegarde et restauration

Une sauvegarde logique PostgreSQL a été créée par `scripts/backup-postgres.ts` dans `artifacts/backups/`. Elle n’est pas destinée à être commitée.

Un dump custom réel a été créé avec `pg_dump` 18.6 puis restauré dans un cluster PostgreSQL local temporaire isolé avec `pg_restore` 18.6. Les compteurs applicatifs et une lecture Prisma ont été validés. Deux erreurs attendues concernaient uniquement les extensions Supabase Vault absentes du cluster local (`supabase_vault` et `vault.secrets`) ; elles ne concernent aucune table applicative. Le cluster temporaire a ensuite été arrêté et nettoyé.

## Validation applicative

- TypeScript : 0 erreur
- ESLint : 0 erreur bloquante
- Unit : 118/118
- E2E : 41/41
- Build production : code 0
- Standalone : `/api/health` HTTP 200, base PostgreSQL `ok`
- Assets premium : 11/11 vérifiés par E2E

## Secrets

Les valeurs d’environnement sensibles restent locales, ne sont pas incluses dans cette documentation et ne doivent pas être ajoutées à Git.
