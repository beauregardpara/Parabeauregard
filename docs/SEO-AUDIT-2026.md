# Para Beauregard — audit SEO et plan d’acquisition Maroc

Date de l’audit : 5 octobre 2026. Domaine audité : `https://parabeauregard.com`.

## Synthèse exécutive

Le site public répond actuellement en HTTPS avec `200` sur l’accueil, `robots.txt`, `sitemap.xml`, les catégories et les marques. Le domaine réellement utilisé est `parabeauregard.com`; `parabeauregad.com` ne résout pas en DNS et `parabeauregard.ma` ne résout pas au moment de l’audit. Le changement de domaine n’a pas été effectué.

Les fondations sont déjà solides : Next.js App Router, metadata dynamiques, canonical, Open Graph, Organization/Product/BreadcrumbList JSON-LD, `next/image`, robots et sitemap dynamiques. Les corrections livrées renforcent les titres produits orientés « prix Maroc », ajoutent les marques au sitemap, enrichissent le WebSite/SearchAction, élargissent les exclusions robots et ajoutent le flux `https://parabeauregard.com/google-shopping.xml`.

## Actions et statut

| Action | Statut | Impact | Priorité |
|---|---|---:|---:|
| robots.txt dynamique | TERMINÉ | Très élevé | P0 |
| sitemap produits/catégories/marques | TERMINÉ | Très élevé | P0 |
| canonical et metadata produit | TERMINÉ | Très élevé | P0 |
| Product + Offer + BreadcrumbList | TERMINÉ | Très élevé | P0 |
| Organization + WebSite + SearchAction | TERMINÉ | Élevé | P0 |
| Flux Merchant Center | TERMINÉ | Très élevé | P1 |
| Exclusion panier/compte/recherche/API | TERMINÉ | Élevé | P0 |
| Corrections lint/typecheck/tests | TERMINÉ | Élevé | P0 |
| Google Search Console | À connecter | Très élevé | P0 |
| Google Merchant Center | À connecter | Très élevé | P1 |
| Google Business Profile | À vérifier avec accès propriétaire | Élevé | P1 |
| Blog SEO | À publier | Très élevé | P1 |
| Backlinks éditoriaux marocains | À développer | Élevé | P2 |

## Constats techniques

### Critique / P0

- Le domaine communiqué `parabeauregad.com` contient probablement une faute et n’est pas résolu. Le site public observé est `parabeauregard.com`. Ne pas lancer de migration avant confirmation de propriété et accès DNS.
- Les secrets présents dans l’environnement local doivent être considérés comme compromis s’ils ont été partagés hors du poste : régénérer les clés Supabase, les identifiants de base et les tokens Vercel, puis remplacer les valeurs locales. Aucun secret n’est inclus dans ce rapport.

### Important / P1

- Les titles produits sont désormais construits avec le nom, la marque si nécessaire et `Prix Maroc`, avec une longueur limitée.
- Le sitemap inclut désormais les marques publiées et exclut les catégories invisibles.
- Le flux produit utilise les prix et le stock réels et n’invente aucun GTIN. URL : `/google-shopping.xml`.
- Les pages de recherche, panier, compte, comparaison, suivi, mot de passe et retours sont exclues de l’exploration.
- Le contenu produit reste dépendant de la qualité des données catalogue : descriptions courtes, actifs, contenance, conseils d’utilisation et FAQ doivent être enrichis uniquement à partir de sources vérifiables.

### Amélioration / P2

- Créer des pages éditoriales dédiées aux besoins (`peau grasse`, `anti-taches`, `SPF50`, `bébé`, etc.) plutôt que de compter sur des résultats de recherche internes.
- Ajouter des liens contextuels article → catégorie → marque → produit.
- Mesurer les clics WhatsApp, ajout panier, checkout et achat dans GA4.

## Domaine et redirections

Ne pas acheter, modifier ou rediriger un domaine sans accord. Si `parabeauregard.com` est bien le domaine officiel :

1. le déclarer comme propriété domaine dans Search Console ;
2. vérifier les versions `http`, `https`, `www` et non-`www` ;
3. garder une seule version canonique ;
4. si un ancien domaine est récupéré, mettre une redirection 301 URL par URL vers les équivalents ;
5. soumettre le sitemap après la migration et surveiller les erreurs 404.

## Pages prioritaires à créer

`/categories/creme-solaire-maroc`, `/categories/spf-50-maroc`, `/besoin/anti-taches`, `/besoin/peau-grasse`, `/besoin/peau-seche`, `/besoin/acne`, `/marques/la-roche-posay`, `/marques/bioderma`, `/marques/cerave`, `/marques/svr`, `/marques/eucerin`, `/marques/mustela`.

Ces pages doivent avoir une introduction originale, une sélection réelle de produits en stock, une FAQ prudente, des liens vers les marques et les fiches produits, et aucune promesse médicale non documentée.

## 100 opportunités de mots-clés Maroc

Difficulté et potentiel sont des estimations qualitatives à valider dans Search Console/Keyword Planner. Aucun volume n’est inventé.

| # | Requête | Intention | Potentiel |
|---:|---|---|---|
| 1 | parapharmacie maroc | commerciale | très haut |
| 2 | parapharmacie en ligne maroc | transactionnelle | très haut |
| 3 | parapharmacie casablanca | locale | haut |
| 4 | produits parapharmacie maroc | commerciale | haut |
| 5 | acheter parapharmacie maroc | transactionnelle | haut |
| 6 | parapharmacie livraison maroc | transactionnelle | haut |
| 7 | paiement à la livraison parapharmacie maroc | transactionnelle | moyen |
| 8 | parapharmacie en ligne casablanca | locale | haut |
| 9 | skincare maroc | commerciale | haut |
| 10 | produits skincare maroc | commerciale | haut |
| 11 | crème solaire maroc | transactionnelle | très haut |
| 12 | écran solaire maroc | transactionnelle | très haut |
| 13 | spf 50 maroc | transactionnelle | très haut |
| 14 | crème solaire visage maroc | transactionnelle | très haut |
| 15 | écran solaire peau grasse maroc | transactionnelle | haut |
| 16 | crème solaire peau sensible maroc | transactionnelle | haut |
| 17 | crème solaire bébé maroc | transactionnelle | haut |
| 18 | protection solaire visage maroc | commerciale | haut |
| 19 | solaire anti taches maroc | commerciale | haut |
| 20 | meilleur écran solaire maroc | informationnelle | haut |
| 21 | anti tache maroc | commerciale | très haut |
| 22 | anti tache visage maroc | commerciale | très haut |
| 23 | crème anti taches maroc | transactionnelle | très haut |
| 24 | sérum anti taches maroc | transactionnelle | haut |
| 25 | routine anti taches maroc | informationnelle | haut |
| 26 | soin pigmentation visage maroc | commerciale | moyen |
| 27 | niacinamide anti taches maroc | transactionnelle | moyen |
| 28 | vitamine c visage maroc | transactionnelle | haut |
| 29 | acide azelaique maroc | transactionnelle | moyen |
| 30 | crème éclat visage maroc | transactionnelle | moyen |
| 31 | peau grasse produits maroc | commerciale | haut |
| 32 | routine peau grasse maroc | informationnelle | très haut |
| 33 | nettoyant peau grasse maroc | transactionnelle | haut |
| 34 | crème hydratante peau grasse maroc | transactionnelle | haut |
| 35 | sérum peau grasse maroc | transactionnelle | haut |
| 36 | pores dilatés produits maroc | informationnelle | moyen |
| 37 | soin imperfections maroc | commerciale | haut |
| 38 | produit acné maroc | commerciale | haut |
| 39 | routine acné maroc | informationnelle | haut |
| 40 | gel nettoyant acné maroc | transactionnelle | haut |
| 41 | peau sèche produits maroc | commerciale | haut |
| 42 | routine peau sèche maroc | informationnelle | haut |
| 43 | crème hydratante peau sèche maroc | transactionnelle | haut |
| 44 | crème peau sensible maroc | transactionnelle | haut |
| 45 | soin barrière cutanée maroc | informationnelle | moyen |
| 46 | sérum hydratant maroc | transactionnelle | haut |
| 47 | acide hyaluronique maroc | transactionnelle | haut |
| 48 | crème peau atopique maroc | transactionnelle | moyen |
| 49 | soin rougeurs visage maroc | transactionnelle | moyen |
| 50 | nettoyant visage maroc | transactionnelle | très haut |
| 51 | la roche posay maroc | commerciale | très haut |
| 52 | la roche posay prix maroc | transactionnelle | très haut |
| 53 | la roche posay anthelios prix maroc | transactionnelle | très haut |
| 54 | la roche posay effaclar prix maroc | transactionnelle | haut |
| 55 | la roche posay mela b3 prix maroc | transactionnelle | haut |
| 56 | bioderma maroc | commerciale | très haut |
| 57 | bioderma prix maroc | transactionnelle | très haut |
| 58 | bioderma photoderm prix maroc | transactionnelle | haut |
| 59 | bioderma sebium prix maroc | transactionnelle | haut |
| 60 | bioderma atoderm prix maroc | transactionnelle | haut |
| 61 | cerave maroc | commerciale | très haut |
| 62 | cerave prix maroc | transactionnelle | très haut |
| 63 | cerave nettoyant prix maroc | transactionnelle | très haut |
| 64 | cerave crème hydratante prix maroc | transactionnelle | haut |
| 65 | cerave peau grasse maroc | commerciale | haut |
| 66 | svr maroc | commerciale | haut |
| 67 | svr prix maroc | transactionnelle | haut |
| 68 | svr sebiaclear prix maroc | transactionnelle | haut |
| 69 | svr sun secure prix maroc | transactionnelle | haut |
| 70 | eucerin maroc | commerciale | haut |
| 71 | eucerin prix maroc | transactionnelle | haut |
| 72 | eucerin oil control prix maroc | transactionnelle | très haut |
| 73 | eucerin anti pigment prix maroc | transactionnelle | haut |
| 74 | eucerin solaire maroc | transactionnelle | haut |
| 75 | mustela maroc | commerciale | haut |
| 76 | mustela prix maroc | transactionnelle | haut |
| 77 | mustela gel lavant prix maroc | transactionnelle | très haut |
| 78 | mustela bébé maroc | commerciale | haut |
| 79 | avene maroc | commerciale | haut |
| 80 | vichy maroc prix | transactionnelle | haut |
| 81 | produits bébé maroc | commerciale | haut |
| 82 | soin bébé peau sensible maroc | transactionnelle | moyen |
| 83 | gel lavant bébé maroc | transactionnelle | haut |
| 84 | crème change bébé maroc | transactionnelle | haut |
| 85 | shampoing bébé maroc | transactionnelle | moyen |
| 86 | shampoing anti chute maroc | transactionnelle | haut |
| 87 | soin cheveux secs maroc | transactionnelle | haut |
| 88 | masque cheveux maroc | transactionnelle | haut |
| 89 | sérum cheveux maroc | transactionnelle | moyen |
| 90 | cuir chevelu sensible maroc | informationnelle | moyen |
| 91 | hygiène corps maroc | commerciale | moyen |
| 92 | gel douche peau sensible maroc | transactionnelle | moyen |
| 93 | déodorant peau sensible maroc | transactionnelle | moyen |
| 94 | crème mains maroc | transactionnelle | moyen |
| 95 | complément alimentaire cheveux maroc | transactionnelle | haut |
| 96 | vitamine d maroc parapharmacie | transactionnelle | haut |
| 97 | magnésium maroc parapharmacie | transactionnelle | haut |
| 98 | probiotiques maroc | transactionnelle | moyen |
| 99 | panier moyen parapharmacie maroc | informationnelle | faible |
| 100 | parapharmacie casablanca livraison | locale | haut |

## Calendrier éditorial sur 3 mois

Publier deux articles et une mise à jour de page commerciale par semaine, avec produits en stock uniquement.

| Semaine | Article principal | Article secondaire | Page commerciale |
|---:|---|---|---|
| 1 | Les meilleurs écrans solaires au Maroc | Comment choisir un SPF 50 ? | SPF 50 Maroc |
| 2 | Quel SPF pour une peau grasse ? | Écran solaire visage : texture et fini | Solaire |
| 3 | Routine peau grasse | Nettoyant visage : comment choisir ? | Peau grasse |
| 4 | Meilleure crème anti-taches au Maroc | Niacinamide, vitamine C et acide azélaïque | Anti-taches |
| 5 | Routine anti-taches | Taches brunes : quand demander conseil ? | Anti-taches |
| 6 | CeraVe ou La Roche-Posay ? | Comment construire une routine débutant | Visage |
| 7 | Bioderma ou La Roche-Posay ? | Peau sensible : les gestes essentiels | Peau sensible |
| 8 | Routine peau sèche | Acide hyaluronique : rôle dans une routine | Hydratation |
| 9 | Les meilleurs produits Mustela pour bébé | Choisir un gel lavant bébé | Bébé |
| 10 | Soins cheveux secs et abîmés | Routine anti-chute : attentes réalistes | Cheveux |
| 11 | Comment choisir un nettoyant visage ? | Gel, lait ou eau micellaire ? | Nettoyants |
| 12 | Routine skincare débutant | Les erreurs fréquentes en skincare | Conseils |

Chaque article doit contenir une source ou une formulation prudente, un lien vers une catégorie, trois à six produits réels, un lien de marque, un CTA vers le catalogue et une date de mise à jour.

## Concurrents observés

Les résultats publics mettent en avant Pharmea, Oasis Paradise, ParaLigne, Parasmart, BeautyLab, Para Lirana, DermoShop, Cousmou, Etapharm et Hey Para. Leurs avantages visibles sont le volume catalogue, les pages par besoin, la livraison 24–72 h, la preuve d’authenticité et les guides éditoriaux. Para Beauregard peut les dépasser sur la qualité des fiches produit, la profondeur des pages SPF/anti-taches, le maillage marque-produit et la réassurance locale Casablanca.

## Search Console, Merchant Center et Business Profile

Ces actions nécessitent l’accès propriétaire :

1. ajouter `parabeauregard.com` comme propriété Domaine dans Search Console ;
2. valider le DNS fourni par Google ;
3. envoyer `https://parabeauregard.com/sitemap.xml` ;
4. créer le flux Merchant Center avec `https://parabeauregard.com/google-shopping.xml` ;
5. vérifier l’adresse, téléphone, horaires et catégorie du Google Business Profile ;
6. relier GA4 et vérifier `view_item`, `add_to_cart`, `begin_checkout`, `purchase`.

## Plan des 30 prochains jours

- Jours 1–3 : valider le domaine officiel, renouveler les secrets exposés et connecter Search Console.
- Jours 4–7 : corriger les produits sans image, sans description, prix nul ou SKU manquant.
- Semaine 2 : créer les pages SPF, anti-taches, peau grasse et marques prioritaires.
- Semaine 3 : publier quatre guides et ajouter les liens internes vers produits et catégories.
- Semaine 4 : connecter Merchant Center, vérifier les refus de produits, mesurer GA4 et obtenir cinq vrais avis clients.

## Références concurrentielles publiques

- https://pharmea.ma/
- https://www.oasisparadise.ma/
- https://www.paraligne.com/
- https://www.parasmart.ma/
- https://parabeautylab.ma/
