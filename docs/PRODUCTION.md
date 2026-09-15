# Exploitation production

## Socle

- Node.js 22 LTS
- PostgreSQL recommandé pour la base de production
- HTTPS obligatoire derrière un reverse proxy maîtrisé
- `NEXT_PUBLIC_SITE_URL` doit être l’URL publique HTTPS
- `SESSION_SECRET` doit être une valeur aléatoire longue, jamais celle de `.env.example`

## Déploiement

1. Installer avec `npm ci`.
2. Définir les variables d’environnement hors du dépôt.
3. Appliquer le schéma Prisma avec la procédure de migration validée.
4. Construire avec `npm run build`.
5. Lancer la sortie standalone avec un utilisateur non privilégié.
6. Vérifier `/api/health` avant d’ouvrir le trafic.

## Réseau et sécurité

Activer `TRUSTED_PROXY=true` uniquement derrière un proxy qui réécrit les en-têtes client. Conserver les en-têtes de sécurité fournis par Next, les cookies sécurisés en HTTPS et l’accès `/admin` protégé par session et RBAC.

## Données et fichiers

Prévoir une sauvegarde PostgreSQL quotidienne, une restauration testée, et un stockage persistant pour `public/uploads` si le scraper est utilisé. Ne jamais exécuter le seed de démonstration en production.

## Services optionnels

- Anthropic : renseigner `ANTHROPIC_API_KEY` côté serveur pour activer le provider IA ; le fallback local reste disponible.
- Firecrawl : renseigner `FIRECRAWL_API_KEY` uniquement côté serveur. La réputation web est une ingestion admin limitée et mise en cache ; le rendu produit ne dépend pas d’un appel Firecrawl en temps réel. Voir `docs/FIRECRAWL_REPUTATION.md`.
- Email : configurer un provider transactionnel et `EMAIL_FROM` vérifié avant d’annoncer l’envoi d’emails.
- Paiement carte : intégrer et certifier le fournisseur Maroc choisi avant d’activer un paiement réel. Le projet ne simule pas une transaction réelle.

## Monitoring

Surveiller le statut HTTP de `/api/health`, les erreurs serveur, les temps de réponse, les créations de commande et l’espace disque. Ajouter Sentry ou un service équivalent seulement après configuration de ses variables secrètes.

## Gate de dépendances

La baseline actuelle utilise Next.js 15.5.25 et corrige la vulnérabilité critique de la version 15.5.23. L’audit npm conserve des alertes transitives `postcss` et `deepmerge-ts`; leur correction complète demande une mise à niveau majeure. Ne pas ouvrir le trafic public avant décision, validation de compatibilité et nouvelle campagne de tests.
