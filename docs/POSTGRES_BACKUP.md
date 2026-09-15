# Sauvegardes PostgreSQL et test de restauration

## Politique minimale

- sauvegarde logique quotidienne avec `pg_dump --format=custom` ;
- rétention recommandée : 7 sauvegardes quotidiennes et 4 hebdomadaires ;
- stockage chiffré hors de l’instance de production ;
- test de restauration au moins mensuel et après changement de schéma ;
- aucune sauvegarde ne doit contenir de secret applicatif hors des données de la
  base elle-même.

## Sauvegarde

Exécuter depuis un environnement protégé, avec `DIRECT_URL` injectée pour une
connexion session dédiée aux opérations d’administration :

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
pg_dump --dbname=$env:DIRECT_URL --format=custom --no-owner --no-privileges --file="para-beauregard-$stamp.dump"
```

Ne pas mettre l’URL ou le mot de passe dans une commande enregistrée dans Git ou
dans un journal CI.

## Test de restauration

Le test doit utiliser une base PostgreSQL temporaire isolée, jamais la base de
production. Exemple :

```powershell
$env:RESTORE_DATABASE_URL = "postgresql://USER@HOST:5432/para_restore?schema=public"
createdb --if-not-exists --maintenance-db=$env:RESTORE_DATABASE_URL para_restore
pg_restore --dbname=$env:RESTORE_DATABASE_URL --clean --if-exists --no-owner latest.dump
```

Après restauration, exécuter les contrôles de comptage et de qualité, puis :

```powershell
$env:NODE_ENV = "production"
$env:DATABASE_URL = $env:RESTORE_DATABASE_URL
npm run prisma:validate
npm run deployment:preflight
```

## Dernière validation

## État de la sauvegarde distante

Le projet Supabase est actuellement sur le plan Free. La page Database
Backups confirme que les sauvegardes natives Supabase ne sont pas incluses sur
ce plan.

En attendant, le dump custom validé ci-dessous reste un backup manuel local
conservé hors Git. Pour satisfaire la politique de production, il devra être
copié vers un stockage distant chiffré et soumis à une planification externe,
sans jamais enregistrer les credentials dans le dépôt.

Le workflow `.github/workflows/database-backup.yml` fournit une stratégie
gratuite avec déclenchement quotidien à 02:00 UTC et déclenchement manuel. Il
utilise le client PostgreSQL du runner, exécute `pg_dump` sans afficher l’URL,
envoie le dump vers le bucket privé `database-backups`, exporte séparément les
objets du bucket `product-images`, puis conserve un artefact GitHub privé
pendant 14 jours. Les secrets requis sont uniquement des secrets GitHub Actions
(`SUPABASE_DB_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`) et ne doivent jamais
être placés dans le dépôt.

Le workflow n’est pas encore actif tant qu’un dépôt GitHub privé n’est pas
connecté au projet et que ces trois secrets ne sont pas créés. La sauvegarde
distante manuelle déjà validée reste disponible dans `database-backups`.

Important : un dump PostgreSQL ne contient pas les fichiers Supabase Storage.
Le script `scripts/backup-supabase-storage.mjs` les exporte séparément afin que
le workflow puisse les archiver sans modifier les objets de production.

Le 13 septembre 2026, un dump custom réel a été créé depuis Supabase :

- fichier : `artifacts/backups/para-beauregard-postgres-20260912-235414.dump`
- taille : 686833 octets
- SHA256 : `00A8639A1ABD367337C4C7FE99C95EC667B386B50E3A103762803FA6A4CC77ED`

Il a été restauré dans un cluster PostgreSQL local temporaire isolé, puis
validé avec PostgreSQL et Prisma :

- Products : 559
- Brands distinctes : 143
- Categories : 15
- Images : 1340
- Users : 2
- Admins : 3
- Orders : 3
- OrderItems : 5
- Promotions : 3
- Favorites : 0

Les contrôles de qualité du restore ont donné zéro image orpheline, zéro prix
invalide, zéro stock négatif, zéro slug dupliqué et zéro marque manquante.
Une fiche produit a été chargée par Prisma depuis la base restaurée.

Deux erreurs non bloquantes concernaient uniquement les extensions Supabase
Vault (`supabase_vault` et `vault.secrets`), absentes du PostgreSQL local de
test ; elles ne concernent pas les tables applicatives restaurées.

Résultat : `TESTED` pour les données applicatives. Le cluster temporaire a été
arrêté ; le dump est conservé dans `artifacts/backups/` et reste exclu de Git.
