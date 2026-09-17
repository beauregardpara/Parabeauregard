# Para Beauregard — runbook de production

Procédures en cas d'incident. Aucune valeur secrète ne doit apparaître ici ni dans
les tickets : les secrets vivent uniquement dans Vercel (projet `para-beauregard`)
et dans les secrets GitHub du dépôt privé.

## Architecture en bref

| Élément | Service |
| --- | --- |
| Application Next.js | Vercel, projet `para-beauregard` (équipe `taha-d616`) |
| Déploiement | GitHub `main` → Vercel production (automatique) |
| Base de données | Supabase PostgreSQL |
| Images produits | Supabase Storage, bucket `product-images` |
| Emails | Resend (domaine d'envoi à vérifier) |
| Sauvegardes | GitHub Actions « Production database and storage backup », 02:00 UTC |
| Surveillance | GitHub Actions « Production health check », toutes les 3 h |

## Flux de livraison (obligatoire)

1. Créer une branche (`fix/...` ou `feat/...`).
2. Ouvrir une pull request vers `main`.
3. Attendre la CI verte : lint, typecheck, tests unitaires, build, E2E, image Docker.
4. Merger (squash). Vercel déploie automatiquement `main` en production.
5. Vérifier `/api/health` (version, base, produits) et un parcours d'achat.
6. Taguer les versions livrées (`v1.0.2` pour un correctif, `v1.1.0` pour une
   évolution). Ne jamais réécrire un tag existant.

Ne jamais pousser directement sur `main`.

## Premiers contrôles (tout incident)

1. `https://para-beauregard.vercel.app/api/health` : HTTP, `status`, `database`,
   `counts.products`, `version`.
2. Vercel → projet → Deployments : le dernier déploiement production est-il « Ready » ?
   Quel commit ?
3. Vercel → Logs (Runtime) sur la période de l'incident.
4. GitHub → Actions : dernier « Production health check » et dernière sauvegarde.
5. Supabase → état du projet (base, stockage).

## Site indisponible

- Vercel en panne ou déploiement en erreur : voir « Mauvais déploiement ».
- `/api/health` renvoie 503 avec `database: error` : voir « Base indisponible ».
- Erreurs 500 sur certaines pages seulement : lire les logs Vercel, identifier le
  commit fautif, revenir en arrière (ci-dessous), puis corriger par PR.

## Mauvais déploiement / mauvais commit sur `main`

Retour rapide (sans toucher au code) :
1. Vercel → Deployments → choisir le dernier déploiement production sain.
2. Menu « … » → **Promote to Production** (ou « Instant Rollback »).
3. Vérifier `/api/health` et le parcours d'achat.

Correction durable :
1. `git revert <commit>` sur une branche, PR, CI verte, merge.
2. Ne pas utiliser `git push --force` sur `main`.

Les migrations de base sont « forward-only » : ne jamais annuler une migration par
une commande destructive.

## Base de données indisponible

1. Supabase → vérifier l'état du projet (pause, quota, incident).
2. Vérifier que les variables `DATABASE_URL` / `DIRECT_URL` existent toujours dans
   Vercel (ne pas afficher leurs valeurs).
3. Si les identifiants ont été changés : mettre à jour les variables Vercel, puis
   redéployer le dernier commit.
4. Interdit en production : `DROP`, `TRUNCATE`, `prisma migrate reset`,
   `prisma db push --force-reset`.

## Échec d'envoi d'images (Storage)

1. Administration → produit → message d'erreur affiché.
2. Vérifier le fichier : JPEG/PNG/WEBP, 5 Mo maximum.
3. Supabase → Storage → bucket `product-images` présent et public en lecture.
4. Vercel : `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PRODUCT_IMAGES_BUCKET`
   présentes. Une clé révoquée ou changée impose une nouvelle clé côté Supabase, la
   mise à jour de Vercel, puis un redéploiement. La clé secrète reste côté serveur.

## Échec d'envoi d'emails

- Les emails ne bloquent jamais une commande : chaque envoi est journalisé
  (Administration → Système & santé).
- Statut « SKIPPED » : aucun fournisseur configuré.
- Statut « FAILED » : vérifier dans Resend que le domaine d'envoi est vérifié et que
  `RESEND_FROM` utilise ce domaine ; vérifier que la clé API est active.
- En attendant : traiter les commandes depuis l'administration et contacter les
  clients par téléphone.

## Échec de sauvegarde

1. GitHub → Actions → « Production database and storage backup » → lire l'étape en
   échec (les journaux ne contiennent pas de secrets).
2. Causes fréquentes : secret `SUPABASE_DB_URL` ou `SUPABASE_SECRET_KEY` expiré ou
   révoqué, panne Supabase.
3. Corriger le secret dans GitHub (nom inchangé), puis relancer le workflow
   manuellement (« Run workflow »).
4. Les artefacts sont privés et conservés 14 jours. Une restauration se teste
   toujours dans une base isolée, jamais dans la production (`docs/BACKUP_RESTORE.md`).

## Alerte « Production health check »

- `HTTP 000/5xx` : site ou Vercel indisponible → « Site indisponible ».
- `database=error` → « Base indisponible ».
- `published products X < 550` : vérifier dans l'administration qu'aucun lot de
  produits n'a été masqué par erreur. Si la baisse est voulue, ajuster la variable
  GitHub `PRODUCTION_MIN_PRODUCTS`.
- Version inattendue (si `PRODUCTION_EXPECTED_VERSION` est défini) : vérifier la
  variable Vercel `APP_VERSION` et le dernier déploiement.

## Accès administrateur perdu

Depuis un poste disposant des variables de production (jamais dans un chat) :

```bash
npm run admin:reset-password -- --email <email-admin>
```

Puis se connecter et changer le mot de passe. Désactiver tout compte inutilisé dans
Administration → Utilisateurs.

## Après un incident

Noter : heure de début et de fin, impact, cause, commit ou déploiement concerné,
actions menées, vérifications faites (`/api/health`, achat test, admin).
