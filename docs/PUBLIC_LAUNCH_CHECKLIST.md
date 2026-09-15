# Checklist lancement public

## Application

- [x] TypeScript, ESLint, unit et E2E verts sur le baseline local
- [x] Standalone smoke test vert sur le baseline local
- [x] `/api/health` vérifie l’application et la base sans secrets
- [x] Cart Drawer, mobile V6 et assistant vérifiés
- [x] Flux COD de validation exécuté sur PostgreSQL
- [ ] Première commande réelle contrôlée

## Firecrawl

- [x] `FIRECRAWL_API_KEY` configurée côté serveur uniquement
- [x] Test manuel limité effectué en environnement de développement
- [x] Cache applicatif et rate-limit vérifiés localement
- [x] Cache persistant PostgreSQL et test de restauration vérifiés
- [x] Sources publiques et conformité robots vérifiées en production

## Infrastructure

- [x] PostgreSQL production provisionné
- [x] `DATABASE_URL` production configurée
- [x] Migration des données validée sur une copie
- [ ] Backup quotidien et test de restauration réalisés
- [x] Domaine Vercel, DNS géré par Vercel et HTTPS par défaut opérationnels
- [x] `NEXT_PUBLIC_SITE_URL` configurée sur l’URL HTTPS Vercel
- [x] Cookies Secure/HttpOnly/SameSite vérifiés sur le parcours de connexion
- [ ] SMTP et email expéditeur configurés et testés
- [ ] Monitoring et logs serveur structurés configurés
- [ ] Domaine personnalisé/DNS propriétaire configurés

## Paiement et confidentialité

- [ ] COD validé
- [ ] Paiement carte désactivé ou provider réel configuré
- [ ] Aucun secret dans le dépôt ou `.env.example`
- [ ] Analytics et cookies soumis au consentement approprié
- [ ] `robots.txt`, sitemap, 404 et métadonnées vérifiés
