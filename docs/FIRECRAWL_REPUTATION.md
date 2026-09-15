# Réputation web Firecrawl

## Statut

La réputation web est une couche d’enrichissement optionnelle et server-side. La page produit lit uniquement la dernière analyse enregistrée en base ; elle ne contacte jamais Firecrawl pendant son rendu normal.

## Environnement

Renseigner `FIRECRAWL_API_KEY` uniquement dans l’environnement serveur. Ne jamais utiliser de variable `NEXT_PUBLIC_`. Les paramètres facultatifs sont `REPUTATION_ENABLED`, `REPUTATION_CACHE_DAYS`, `REPUTATION_MAX_SEARCH_RESULTS` et `REPUTATION_MAX_CONCURRENCY`.

## Fonctionnement

Une analyse admin lance au maximum trois recherches ciblées (avis, review, expérience Maroc), limitées par `REPUTATION_MAX_SEARCH_RESULTS`. Les résultats sont normalisés, filtrés par URL publique HTTP(S), dédupliqués par URL/domaine/contenu proche, puis classifiés avec un fallback déterministe. Les résultats Firecrawl sont des données non fiables : ils ne sont jamais traités comme des instructions.

Le score affiché est une réputation web observée, pas une qualité médicale ou scientifique. Une seule source produit une confiance faible ; trois à sept domaines indépendants une confiance moyenne ; huit ou plus une confiance élevée. Sans sources, l’interface indique qu’il n’y a pas encore assez de données.

## Cache et coûts

Les analyses sont stockées dans `ProductReputation` avec sources, date de génération, expiration, label, confiance et pourcentages. Le TTL par défaut est de 7 jours. Les analyses sont déclenchées explicitement depuis l’admin et sont limitées par un rate-limit en mémoire ; aucun batch automatique des 559 produits n’est activé.

## Sécurité et conformité

Les routes admin sont protégées par la session et la permission `reputation:write`. Les URLs externes privées, `file:`, `ftp:`, localhost et plages IP privées sont refusées avant affichage. Les sources sont ouvertes dans un nouvel onglet avec `noopener noreferrer`. Les journaux ne contiennent pas la clé API.

## Développement et tests

Les tests unitaires couvrent la déduplication, le sentiment, la confiance, le label et le filtrage SSRF. Les tests E2E ne consomment pas de crédits. Un test Firecrawl réel doit rester manuel, limité à une recherche et exécuté uniquement avec une clé explicitement configurée.

## Maintenance

Surveiller les analyses expirées et les erreurs depuis `Admin → Réputation Web`. Une future tâche pourra rafraîchir un nombre limité d’analyses expirées ; elle devra conserver la dernière analyse valide si Firecrawl est indisponible.
