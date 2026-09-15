# PostgreSQL production runbook

## État vérifié le 12 septembre 2026

- La base locale est SQLite (`prisma/dev.db`) et a été sauvegardée avant toute
  opération de préparation PostgreSQL dans `artifacts/backups/`.
- Comptages locaux : 559 produits, 1 340 images, 143 marques distinctes, 15
  catégories, 2 clients, 3 administrateurs, 2 commandes et 0 analyse de réputation.
- `prisma/schema.prisma` est valide et contient le modèle `ProductReputation`
  avec son cache agrégé (`sourcesJson`, `positivesJson`, `negativesJson`). Il n’y a
  pas de modèles séparés `ReputationAnalysis`/`ReputationSource` dans cette version.
- Le dépôt ne contient actuellement aucun dossier `prisma/migrations` : la base
  locale n’est pas gérée par Prisma Migrate.
- Aucune instance PostgreSQL de production ni `DATABASE_URL` PostgreSQL n’a été
  fournie ; aucune migration distante n’a donc été exécutée.

## Stratégie SQLite / PostgreSQL

Le schéma métier reste unique. Le wrapper `scripts/prisma.mjs` génère à la volée
un schéma Prisma provider-specific dans un fichier généré ignoré sous `prisma/`, après avoir parsé
strictement le bloc `datasource db` du schéma canonique :

- `file:...` → SQLite pour le développement local ;
- `postgres://...` ou `postgresql://...` → PostgreSQL pour la CI et la production.

Les commandes de projet (`npm run prisma:validate`, `npm run db:push`,
`npm run db:migrate:deploy`, `npm run build`) passent par ce wrapper. Le fichier
généré est ignoré par Git et n’est pas une seconde copie maintenue du modèle.
Chaque provider doit être validé par Prisma avant utilisation.

Le schéma n’utilise pas de type SQLite-only : enums Prisma, chaînes JSON stockées
en `String`, `Int`, `Float`, `Boolean`, `DateTime`, relations et indexes sont
compatibles avec PostgreSQL. Les champs JSON de réputation sont volontairement
conservés en texte pour ne pas changer l’architecture lors du passage en production.

## Baseline et migration

La première migration PostgreSQL doit être créée depuis le schéma validé, sur une
copie de la base cible, puis appliquée avec `npm run db:migrate:deploy`. Ne pas
utiliser `prisma db push` sur une base de production après création de l’historique.

```powershell
$env:NODE_ENV = "production"
$env:DATABASE_URL = "postgresql://USER@HOST:5432/DB?schema=public"
npm run prisma:validate
npm run db:migrate:deploy
```

Cette procédure n’a pas été exécutée ici, car l’URL ci-dessus reste un exemple.
La migration de données est une étape séparée et explicitement confirmée, avec la
sauvegarde SQLite comme point de retour. Le projet fournit un export JSON auditable
et un import PostgreSQL protégé :

```powershell
# 1. Avec le client SQLite généré et la base locale sélectionnée
$env:DATABASE_URL = "file:./dev.db"
node scripts/prisma.mjs generate
npm run db:export:sqlite -- --output=artifacts/migration-export/sqlite-export.json

# 2. Après revue de l’export, sur une base PostgreSQL vide dédiée
$env:DATABASE_URL = "postgresql://USER@HOST:5432/DB?schema=public"
node scripts/prisma.mjs generate
npm run db:import:postgres -- --input=artifacts/migration-export/sqlite-export.json
```

L’import exige `MIGRATION_CONFIRM=YES`, vérifie le format et les 559 produits,
refuse par défaut une cible non vide, préserve les IDs/relations, puis recale les
séquences PostgreSQL. Les commandes ou comptes de démonstration doivent être
exclus après décision métier explicite ; le script ne les supprime pas en silence.

Avant et après migration, enregistrer au minimum :

| Entité | Valeur locale vérifiée |
|---|---:|
| Produits | 559 |
| Images | 1 340 |
| Marques distinctes | 143 |
| Catégories | 15 |
| Clients | 2 |
| Administrateurs | 3 |
| Commandes locales | 2 |
| ProductReputation | 0 |

La migration est acceptable seulement si les comptes attendus correspondent, les
559 produits sont conservés, les relations sont intactes, les séquences PostgreSQL
sont recalées, et les contrôles de qualité renvoient zéro image manquante, prix
invalide, stock négatif ou slug dupliqué.

## Vérifications après provisionnement

1. Créer une base et un rôle PostgreSQL dédiés ; ne jamais committer la chaîne.
2. Définir `DATABASE_URL` hors dépôt et lancer `npm run prisma:validate`.
3. Créer/appliquer la baseline sur une copie, puis effectuer l’import contrôlé.
4. Comparer les comptages avant/après et appeler `/api/health`.
5. Vérifier que `database` vaut `ok` et ne renvoie aucune URL ni secret.
6. Tester une analyse Firecrawl admin sur trois produits au maximum ; vérifier que
   `ProductReputation` est lu depuis PostgreSQL lors des affichages suivants.
7. Tester la concurrence d’une commande COD et l’absence de stock négatif.

## Premier administrateur

Après génération du client PostgreSQL, créer le premier compte sans valeur par
défaut :

```powershell
$env:DATABASE_URL = "postgresql://USER@HOST:5432/DB?schema=public"
$env:ADMIN_EMAIL = "admin@domaine-verifie.tld"
$env:ADMIN_NAME = "Administrateur"
$env:ADMIN_ROLE = "SUPER_ADMIN"
# ADMIN_PASSWORD peut être injecté par le gestionnaire de secrets ; il n’est jamais journalisé.
node scripts/prisma.mjs generate
npm run admin:create
```

Si `ADMIN_PASSWORD` n’est pas fourni, le script le demande. Il refuse les mots de
passe faibles et ne remplace jamais un compte existant.

## Environnement de production

Voir `.env.production.example`. `NEXT_PUBLIC_SITE_URL` doit être l’URL HTTPS réelle
du domaine. `DATABASE_URL` doit être une URL PostgreSQL fournie par l’hébergeur.
Les secrets restent dans le gestionnaire de secrets de l’hébergeur.
