# Para Beauregard — Rapport de finalisation

_Date : 8 septembre 2026 · Portée : audit complet du dépôt, corrections, finition._

---

## Résumé

Le projet Next.js 15 à la racine était déjà **structurellement sain** au démarrage :
0 erreur TypeScript, 0 erreur ESLint, 76 tests unitaires au vert, build de production
réussi. Il n'a donc pas été reconstruit : le travail a porté sur ce qui n'était pas
visible depuis ces indicateurs — la **qualité des données**, la **véracité du contenu
affiché**, la **sécurité réelle de l'espace d'administration** et le **comportement
responsive**.

Les corrections les plus importantes sont :

1. **Une fuite de données d'administration** : `GET /admin` sans session renvoyait
   200 avec le chiffre d'affaires, le panier moyen, des références de commande et
   des noms de clients dans la charge utile RSC.
2. **Le tunnel de commande était bloqué** : aucune commande ne pouvait aboutir
   (message Zod brut « Invalid literal value, expected "COD" » affiché au client).
3. **Des chiffres inventés en page d'accueil** (10 000 produits, 24 000 clients,
   4,9/5) et des témoignages fictifs marqués « Cliente vérifiée ✓ ».
4. **Un défilement horizontal sur tout le site** provoqué par les tiroirs fermés.
5. **Un catalogue brut** : 284 fausses marques, libellés tout en capitales,
   descriptions polluées par l'interface des sites sources.

État final vérifié : **0 erreur TypeScript, 0 erreur/0 avertissement ESLint,
111 tests unitaires, 31 tests end-to-end (dont accessibilité axe-core et
responsive 375→1440 px), build de production réussi.**

---

## Audit initial

| Domaine | Constat au démarrage |
| --- | --- |
| TypeScript | 0 erreur |
| ESLint | 0 erreur, 12 avertissements (code mort) |
| Tests unitaires | 76 tests, tous au vert |
| Tests e2e | 24 tests ; 4 en échec (dont 1 violation a11y réelle) |
| Build production | Réussi |
| Prisma | 36 modèles, relations et index corrects, aucune migration versionnée |
| Base | 559 produits publiés, 1 340 images, **0 avis**, **0 produit mis en avant** |
| Marques | **284 libellés distincts**, dont des noms de catégories |
| Sécurité | Server Actions correctement protégées ; **pages admin non protégées en amont** |
| Code | Aucun `any`, aucun `@ts-ignore`, aucun TODO parasite |

Le mockup Vite a été consulté comme référence visuelle uniquement ; aucune partie
de son architecture n'a été reprise.

---

## Bugs trouvés

### Bloquants

1. **Commande impossible** — `checkoutSchema` exige `paymentMethod: z.literal("COD")`
   mais `/commander` ne transmettait pas ce champ. Toute validation échouait, et le
   message d'erreur Zod anglais était affiché tel quel au client.
2. **Fuite de données d'administration** — le `redirect()` du layout `/admin` arrive
   trop tard : Next.js rend le layout **et** la page en parallèle, si bien que la
   charge utile RSC de la page partait sur le réseau avant la redirection. Vérifié :
   `curl http://localhost:3000/admin` renvoyait 67 451 octets contenant le CA total
   (1 873,00 DH), le panier moyen, les références `PB-2026-…` et des noms de clients.

### Fonctionnels

3. **Défilement horizontal global** — les tiroirs fermés (panier, filtres),
   positionnés hors écran à droite, élargissaient le document de 448 px sur toutes
   les pages ; sur mobile la page mesurait le double de la largeur de l'écran.
4. **Pagination débordante sur mobile** — toutes les pages étaient listées : sur un
   rayon de 9 pages la barre mesurait 1 096 px pour un écran de 375 px.
5. **Recherche insensible aux accents absente** — « avene » ne trouvait rien alors
   qu'« Avène » existe (SQLite compare les `LIKE` octet à octet). Idem « sterimar »,
   « kerastase », « loreal ».
6. **Pertinence de la recherche** — les suggestions étaient triées uniquement sur les
   ventes : « roge cavailles » proposait un soin Eucerin.
7. **Cross-sell du panier proposant des ruptures** — 4 des produits recommandés dans
   le panier étaient marqués « Indisponible ».
8. **Graphique de CA journalier faux** — les clés de journée étaient calculées en UTC
   alors que les bornes étaient locales : au Maroc (UTC+1) la commande du jour
   n'apparaissait jamais dans le graphique.
9. **Image du hero en 404** — `/para/hero-v2.webp` n'existe pas, le fichier est dans
   `/brand/`. Deux erreurs console sur chaque page d'accueil.
10. **Scraper bloqué** — une exécution restée en `RUNNING` depuis le 27 août bloquait
    définitivement le planificateur ; l'API manuelle n'avait aucune garde anti
    double-exécution.
11. **Commande amputée possible** — un produit dépublié entre l'ajout au panier et la
    validation était silencieusement ignoré : la commande était créée sans lui.
12. **Référence de commande sans contrôle d'unicité** — `Order.reference` est `@unique` ;
    une collision serait remontée au client comme « Erreur base de données ».
13. **Violation d'accessibilité** — `aria-label` sur un `<p>` sans rôle (axe-core,
    niveau A, impact « serious »).
14. **Contenu invisible sans JavaScript** — les blocs animés restaient à `opacity: 0`.
15. **Taux de fidélité erroné** — la page compte annonçait « 1 pt / 10 DH » alors que
    le taux réel est de 1 point par DH.
16. **Nom de service d'un autre projet** — `/api/health` renvoyait
    `"service": "thiqti-ma-storefront"`.

### Données et contenu

17. **284 marques parasites** — « AVENE CICALFATE », « CERAVE CREME », « LA ROCHE »,
    et des noms de catégories utilisés comme marques (« Hydratation corps »).
18. **Libellés produits tout en capitales** — « LA ROCHE POSAY MELA B3 SERUM
    CONCENTRE 30 ML ».
19. **Slugs répétant la marque** — `/produits/guinot-gel-guinot-gel-nettoyant-…`.
20. **Descriptions polluées** — 278 fiches contenaient « Lire la suite », « Show less »
    ou de longues séquences d'espaces héritées du HTML source.
21. **Chiffres inventés** — accueil : « 10 000+ produits », « 120+ villes »,
    « 24 000+ clients satisfaits », « 4,9/5 » ; hero : « 4,9 ★ · 2 400+ avis »,
    « +10k produits », « 98 % clients satisfaits ».
22. **Témoignages fictifs** — trois clientes inventées, présentées comme
    « Cliente vérifiée ✓ ».
23. **Carrousel de marques codé en dur**, incluant « Mustela » qui n'existe pas au
    catalogue.
24. **Bannières de catégorie inexploitables** — visuels génériques comportant du texte
    en chinois, des flacons de marques inventées et un prix en yuans (¥1599).
25. **Messages de livraison contradictoires** — « 24–48h » à plusieurs endroits alors
    que les constantes indiquent 24 h à Casablanca et 48–72 h ailleurs.
26. **Duplication de constantes** — `29` et `500` codés en dur dans `/commander`.
27. **Erreur de copier-coller** — la tuile « Paiement à la livraison » du hero portait
    le sous-titre de la tuile « Livraison rapide ».

### Robustesse / qualité

28. **Build incrémental systématiquement en échec** sous Node 24
    (`ERR_INVALID_ARG_TYPE` dans le hacheur webpack) ; seul un `.next` propre passe.
29. **Tests e2e instables** — l'animation d'apparition déplaçait les cartes pendant
    le clic de Playwright.
30. **12 avertissements ESLint** de code mort, dont un ternaire utilisé comme
    instruction et un `panier moyen` recalculé en double.

---

## Bugs corrigés

Les 30 points ci-dessus ont tous été corrigés. Points saillants :

| Bug | Correction |
| --- | --- |
| Commande bloquée | `paymentMethod: "COD"` transmis par `/commander`, utilisé côté serveur, message d'erreur en français ; test de contrat client↔serveur ajouté |
| Fuite admin | Vérification HMAC complète du jeton dans `src/middleware.ts` (Web Crypto, compatible edge), **avant tout rendu** ; le layout reste en défense en profondeur |
| Défilement horizontal | Tiroirs panier et filtres encapsulés dans un conteneur `overflow-hidden` maintenu dans le viewport |
| Pagination | Pagination condensée (première / dernière / courante ± 1 + ellipses) avec précédent/suivant, extraite dans `src/lib/pagination.ts` et testée |
| Recherche sans accents | Colonne `Product.searchText` repliée (minuscules, sans accents, + variante compacte), alimentée par le scraper et le script de reprise, indexée |
| Pertinence | Classement des suggestions par correspondance sur le texte replié avant le volume de ventes |
| Cross-sell | Filtre de disponibilité `AVAILABLE` appliqué à toutes les recommandations |
| CA journalier | Clés de journée calculées en heure locale (`dayKey`) |
| Hero 404 | Chemin corrigé vers `/brand/hero-v2.webp` |
| Scraper | `findActiveRun()` partagé : péremption des exécutions fantômes après 6 h, refus explicite en 409 côté API |
| Marques | `src/lib/brands.ts` : référentiel de ~180 alias, rejet des libellés non-marques ; **284 → 142 marques** |
| Libellés | `src/lib/product-name.ts` : casse de titre préservant sigles, unités et références ; **533 libellés reformatés** |
| Descriptions | `src/lib/product-description.ts` ; **278 descriptions nettoyées** |
| Slugs | `productSlugSource()` ; **555 slugs réécrits**, unicité vérifiée |
| Chiffres inventés | Compteurs et hero alimentés par la base (559 références, 142 marques) ; promesses remplacées par des engagements réels |
| Témoignages | Alimentés par les avis réellement approuvés, section masquée s'il n'y en a aucun |
| Bannières | Remplacées par une bande d'identité (icône du rayon + réassurances), visuels retirés de la base |
| Sans JavaScript | Repli `<noscript>` neutralisant l'animation d'apparition |
| Build incrémental | `npm run clean` intégré à `npm run build` |
| Tests instables | Déclenchement anticipé de l'animation (`rootMargin`), navigation par `href` dans le test mobile |

---

## Architecture conservée

Conformément à la consigne, rien de fonctionnel n'a été réécrit :

- App Router Next.js 15, Server Components par défaut, Server Actions pour les
  mutations ;
- authentification maison (scrypt + jetons HMAC signés, cookies `httpOnly`) et RBAC
  à trois rôles ;
- validation Zod côté serveur et recalcul intégral des montants à la commande ;
- moteur de scraping multi-sources avec respect de `robots.txt`, journalisation et
  module qualité ;
- assistant IA avec repli local sur le catalogue réel ;
- système de fidélité, favoris, comparateur, alertes stock, retours, journal
  d'activité ;
- design system Tailwind v4 (palette `para-*`, Inter, tokens d'ombres et de rayons).

---

## Architecture améliorée

- **Nouveaux modules métier isolés et testés** : `brands.ts`, `product-name.ts`,
  `product-description.ts`, `pagination.ts`.
- **Protection admin déplacée en amont** (middleware) plutôt qu'au seul rendu.
- **Constantes centralisées** : plus aucun `29` / `500` / « 24–48h » en dur ; les
  valeurs de la base font autorité, les constantes ne servent que de repli.
- **Taux de fidélité lu depuis les paramètres** au lieu d'un texte figé.
- **Garde anti double-exécution du scraper** partagée entre le planificateur et l'API.
- **Scripts de maintenance idempotents** avec mode aperçu par défaut :
  - `npm run brands:normalize` (marques, libellés, descriptions, index de recherche ;
    `--slugs` pour la reprise des URLs, `--write` pour appliquer) ;
  - `npm run seed:demo` (avis de démonstration, mises en avant, nouveautés ;
    `--purge` pour retirer les avis de démonstration) ;
  - `npm run start:standalone` (cohérent avec `output: standalone`).

---

## Fonctionnalités ajoutées

- Bouton d'affichage/masquage du mot de passe et indication « 6 caractères minimum »
  sur connexion et inscription.
- Avertissement obligatoire dans l'assistant IA : « Les recommandations proposées ne
  remplacent pas l'avis d'un professionnel de santé. »
- Carrousel de marques cliquable, alimenté par les marques réellement présentes.
- Nom du produit rappelé dans le formulaire d'alerte de retour en stock.
- Pagination condensée avec liens précédent/suivant (`rel="prev"` / `rel="next"`).
- Icônes attribuées à tous les sous-rayons.

---

## Pages finalisées

Toutes les routes publiques répondent en 200 (vérifié) : accueil, `/categories/[slug]`,
`/produits/[slug]`, `/recherche`, `/promotions`, `/nouveautes`, `/marques`,
`/marques/[slug]`, `/besoin`, `/panier`, `/commander`, `/commande/[reference]`,
`/suivi-commande`, `/retour`, `/comparateur`, `/compte` et ses sous-pages,
`/contact`, `/faq`, `/cgv`, `/confidentialite`, `/mentions-legales`,
`/livraison-retours`, `/a-propos`, plus les 14 écrans d'administration.

---

## API finalisées

| Route | État |
| --- | --- |
| `POST /api/chat` | Fonctionnelle, repli local sur le catalogue réel, avertissement santé ajouté |
| `GET /api/search` | Recherche sans accents + classement par pertinence |
| `GET /api/compare` | Fonctionnelle, état vide correct |
| `GET /api/health` | Nom de service corrigé, aucun secret exposé |
| `POST /api/admin/scrape` | 401 sans session valide (jeton vérifié), 403 sans permission, 409 si exécution en cours |

---

## Prisma / DB

- Schéma inchangé à une exception près : ajout de `Product.searchText` (`String?`,
  indexé) pour la recherche insensible aux accents. Appliqué via `prisma db push`,
  conformément au fonctionnement actuel du projet.
- Aucune donnée détruite. Sauvegardes de `dev.db` prises avant chaque écriture de
  masse (conservées hors dépôt).
- État final : 559 produits publiés, 142 marques, 15 catégories, 1 340 images,
  100 avis approuvés, 559 produits indexés pour la recherche, 8 produits mis en
  avant, 12 nouveautés.

---

## Auth / sécurité

- **Corrigé** : fuite de la charge utile RSC des pages d'administration. Le middleware
  vérifie désormais la signature HMAC-SHA256 et l'expiration du jeton avant tout
  rendu, pour `/admin/*` comme pour `/api/admin/*`. Un cookie forgé est rejeté
  (vérifié : 307 sur les pages, 401 sur l'API).
- **Durci** : `'unsafe-eval'` retiré de la CSP en production (conservé en
  développement pour le rafraîchissement à chaud).
- Vérifié inchangé et correct : mots de passe scrypt salés, cookies `httpOnly` +
  `secure` en production, comparaison à temps constant des signatures, RBAC sur
  toutes les Server Actions d'administration, limitation de débit sur la commande et
  le scraping, validation Zod systématique, recalcul serveur de tous les montants,
  descriptions rendues comme du texte (aucune injection HTML).
- Tests de non-régression ajoutés : absence de fuite sur trois pages admin, rejet du
  cookie forgé.

---

## Responsive

Test permanent ajouté (`e2e/responsive.spec.ts`) : 12 pages × 5 largeurs
(375, 430, 768, 1024, 1440 px), animations neutralisées pour une mesure stable.
Trois débordements réels corrigés (tiroirs, pagination, pied de page).
**Résultat : aucun débordement horizontal.**

---

## UI / UX

- Identité visuelle conservée (palette `para-*`, Inter, cartes et ombres existantes).
- Contenu rendu véridique : compteurs, marques et témoignages proviennent de la base.
- Bannières de catégorie remplacées par une bande d'identité cohérente sur tous les
  rayons.
- Catalogue lisible : marques canoniques, libellés en casse de titre, unités
  normalisées (« 340 g », « 30 ml »).
- Animations d'apparition déclenchées en amont du viewport : plus de contenu qui
  bouge sous le doigt.

---

## SEO

Vérifié en fonctionnement : `robots.txt` (admin, API et tunnel de commande exclus),
`sitemap.xml` à 584 URLs, JSON-LD `Product` + `Offer` + `Brand` + `AggregateRating` +
`BreadcrumbList` + `Organization`, métadonnées et `canonical` dynamiques par produit,
catégorie et marque. La réécriture des slugs supprime la répétition de la marque dans
les URLs.

---

## Performance

- Requêtes de page d'accueil regroupées en un seul `Promise.all` (marques les mieux
  fournies incluses).
- Recherche appuyée sur une colonne indexée plutôt que sur quatre `LIKE`.
- Recommandations filtrées en base plutôt qu'après coup.
- `unstable_cache` conservé sur les agrégats analytiques.
- Poids JS partagé inchangé : **103 kB** ; pages produit/catalogue entre 104 et 119 kB.

---

## Tests exécutés

Toutes les commandes ci-dessous ont été **réellement exécutées** sur la version finale.

```bash
npx prisma generate      # ✔ Prisma Client v6.19.3
npx prisma migrate status # ⚠ aucune migration (projet en `db push`)
npm run typecheck        # ✔ 0 erreur
npm run lint             # ✔ 0 erreur, 0 avertissement
npm test                 # ✔ 12 fichiers, 111 tests
npm run build            # ✔ Compiled successfully
npm run test:e2e         # ✔ 31 tests (chromium + iPhone 12)
```

Tests unitaires ajoutés : `brands`, `product-name` (dont repli de recherche),
`product-description`, `pagination`, `recommendations`, `checkout-contract` —
soit 35 tests supplémentaires.
Tests e2e ajoutés : non-fuite des données admin, rejet d'un cookie forgé,
5 tests responsive.

---

## Résultat build

```
✓ Compiled successfully in 36.2s
✓ Generating static pages (46/46)
+ First Load JS shared by all   103 kB
ƒ Middleware                    34.4 kB
```

⚠️ Le build incrémental échoue sous Node 24 (bogue connu du hacheur webpack) ;
`npm run build` supprime désormais `.next` au préalable. Ne pas lancer un build
pendant que `npm run start` tourne : le serveur verrouille `.next`.

---

## Parcours testés manuellement

| Parcours | Résultat |
| --- | --- |
| Accueil → catégorie → fiche produit → ajout panier | ✔ |
| Panier : quantité, sous-total, livraison offerte, cross-sell | ✔ |
| Code promo `BIENVENUE10` sur 680 DH | ✔ −68,00 DH, total 612,00 DH |
| Commande complète (COD) | ✔ référence `PB-2026-10EFSOX7G3` |
| Effets serveur de la commande | ✔ stock 5→3, `soldCount` +2, historique de stock, statut `NEW`, 1 360 points crédités |
| Page de confirmation | ✔ référence, statut, détail, adresse, paiement |
| Inscription → compte client | ✔ points, commandes, total dépensé, membre depuis |
| Connexion admin → tableau de bord | ✔ CA, panier moyen, top ventes, CA par catégorie, exécutions du scraper |
| Admin sans session | ✔ 307 vers `/admin/login`, aucune donnée transmise |
| Recherche + filtres + tri + pagination | ✔ |
| Assistant IA (repli local) | ✔ 4 produits réels proposés |

---

## Variables ENV encore nécessaires

| Variable | Statut | Usage |
| --- | --- | --- |
| `DATABASE_URL` | ✔ définie | SQLite en développement ; PostgreSQL recommandé en production |
| `SESSION_SECRET` | ✔ définie | **À régénérer pour la production** (valeur de développement actuellement) |
| `NEXT_PUBLIC_SITE_URL` | ❌ absente | Sans elle, `sitemap.xml`, les `canonical` et les liens d'e-mail pointent vers `localhost` |
| `ANTHROPIC_API_KEY` | ❌ absente | Assistant IA en repli local ; à fournir pour les réponses conversationnelles |
| `FIRECRAWL_API_KEY` | ✔ définie | Enrichissement des fiches |
| Configuration e-mail | ❌ absente | `/api/health` indique `emailKind: "none"` : aucun e-mail de confirmation n'est réellement envoyé |

---

## Informations commerciales à confirmer avant une mise en ligne réelle

Les coordonnées visibles du storefront sont centralisées dans
`src/config/business.ts` et utilisent désormais le téléphone officiel,
l’adresse email officielle et la localisation Casablanca communiqués pour le
projet. Restent à confirmer avant une mise en ligne juridique complète :

- raison sociale, RC, ICE et IF ;
- adresse postale complète du siège ;
- liens des réseaux sociaux ;
- délais de livraison et politique de retour définitifs.

---

## Points restant à faire

1. **Avis de démonstration** — les 100 avis créés par `npm run seed:demo` sont des
   données de démonstration. À supprimer avant toute mise en ligne réelle :
   `npm run seed:demo -- --purge`.
2. **Images de catégories** — les visuels `public/brand/*.webp` ne sont plus
   référencés mais restent servis publiquement ; à remplacer par de vraies
   photographies ou à supprimer.
3. **Migrations Prisma** — le projet fonctionne en `prisma db push`, sans historique
   versionné. Établir une migration de référence avant la production.
4. **Optimisation des images** — `images.unoptimized: true` désactive le
   redimensionnement et la conversion WebP de Next. À réactiver une fois `sharp`
   disponible dans l'image Docker.
5. **`images.remotePatterns`** accepte actuellement n'importe quel hôte HTTP/HTTPS ;
   à restreindre.
6. **Envoi d'e-mails** non configuré (confirmation de commande, alertes stock).
7. **Slugs** — la reprise a été appliquée (`--slugs`) ; si des liens externes
   existaient déjà, prévoir des redirections 301.
8. **13 produits sans description** et **52 produits en rupture** : à traiter depuis
   `/admin/produits` et `/admin/quality`.
9. **Le dépôt n'est pas sous Git.** C'est le risque le plus élevé du projet :
   aucune des modifications n'est réversible autrement que par sauvegarde manuelle.
   `git init` puis un premier commit sont vivement recommandés.

---

## Recommandations production

1. Initialiser Git et verrouiller les dépendances avant tout déploiement.
2. Régénérer `SESSION_SECRET` et définir `NEXT_PUBLIC_SITE_URL`.
3. Migrer vers PostgreSQL (`docs/POSTGRESQL.md` existe déjà) : SQLite ne supporte pas
   les écritures concurrentes d'un site marchand.
4. Déployer avec `npm run start:standalone` (cohérent avec `output: standalone`).
5. Changer les mots de passe des trois comptes d'administration issus du seed.
6. Brancher un fournisseur d'e-mails et vérifier le parcours de confirmation.
7. Planifier `npm run brands:normalize` après chaque campagne de scraping afin que
   les nouvelles fiches restent normalisées (le scraper le fait déjà à l'insertion).
8. Surveiller `/api/health` et `/admin/journal`.
9. Faire relire les pages légales par un juriste une fois les informations réelles
   renseignées.

---

## Tableau de vérification

Seules les lignes réellement vérifiées portent un ✅.

| Vérification | Résultat | Preuve |
| --- | --- | --- |
| TypeScript | ✅ | `tsc --noEmit` — 0 erreur |
| ESLint | ✅ | `eslint .` — 0 erreur, 0 avertissement |
| Tests | ✅ | 12 fichiers, 111 tests unitaires + 31 tests e2e |
| Prisma | ✅ | `prisma generate` OK, schéma poussé, données intègres |
| Build production | ✅ | `next build` — 46 pages générées |
| Mobile | ✅ | e2e iPhone 12 + responsive 375/430 px sans débordement |
| Desktop | ✅ | responsive 768/1024/1440 px sans débordement |
| Admin | ✅ | connexion, tableau de bord et protection vérifiés en fonctionnement |
| Checkout | ✅ | commande réelle créée, stock et fidélité vérifiés en base |
| SEO | ✅ | robots, sitemap (584 URLs), JSON-LD vérifiés en réponse HTTP |
| Sécurité critique | ✅ | fuite admin corrigée et couverte par un test ; cookie forgé rejeté |
| Migrations versionnées | ❌ | aucune migration Prisma (projet en `db push`) |
| Envoi d'e-mails | ❌ | non configuré, non testable |
| Assistant IA distant | ❌ | non testé : `ANTHROPIC_API_KEY` absente (repli local vérifié) |
| Accessibilité complète | ⚠️ | axe-core niveau A sur 4 pages clés ✅ ; audit AA complet non réalisé |
| Charge / performance réelle | ❌ | non mesurée (aucun Lighthouse ni test de charge exécuté) |

---

_Toutes les affirmations de ce rapport correspondent à des commandes réellement
exécutées ou à des vérifications faites dans le navigateur. Ce qui n'a pas pu être
vérifié est explicitement marqué comme tel._
