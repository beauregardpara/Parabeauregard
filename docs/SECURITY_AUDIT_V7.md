# Security Audit V7

Date de l'audit : 2026-09-10

## Périmètre et méthode

Commandes exécutées :

- `npm audit`
- `npm audit --json`
- `npm audit --omit=dev`
- `npm audit --omit=dev --json`
- `npm ls deepmerge-ts --all`
- `npm ls postcss --all`
- `npm ls prisma --all`
- `npm ls @prisma/config --all`
- `npm ls next --all`
- inspection des versions installées et de `.next/standalone`
- inspection des imports applicatifs dans `src/` et `scripts/`

Aucun `npm audit fix --force` n'a été exécuté. Aucune migration Next.js 16 ou Prisma majeure n'a été exécutée.

## Résultat npm audit

### FULL DEPENDENCY TREE

`npm audit` : **5 vulnerabilities (1 moderate, 4 high, 0 critical)**.

Les cinq nœuds vulnérables signalés par le rapport npm sont :

1. `deepmerge-ts@7.1.5` — high — GHSA-ggr8-5vv4-36mx.
2. `@prisma/config@6.19.3` — high — hérite de GHSA-ggr8-5vv4-36mx via `deepmerge-ts`.
3. `prisma@6.19.3` — high — hérite de GHSA-ggr8-5vv4-36mx via `@prisma/config`.
4. `postcss@8.4.31` sous `next` — high — quatre avis PostCSS détaillés ci-dessous.
5. `next@15.5.25` — moderate dans l'agrégation npm, via son `postcss` imbriqué ; il n'y a pas d'avis indépendant « Next.js 15.5.25 » dans le rapport courant.

### PRODUCTION DEPENDENCIES ONLY

`npm audit --omit=dev` : **5 vulnerabilities (1 moderate, 4 high, 0 critical)**.

Le résultat est identique car `next` est une dépendance de production directe et son `postcss` imbriqué est donc conservé dans l'arbre examiné. Le nœud `prisma` apparaît également dans l'arbre npm local, mais il s'agit de l'outil CLI déclaré en `devDependencies` et il n'est pas présent dans le standalone.

## Avis et chaînes exactes

Les quatre avis PostCSS regroupés par npm sont :

| Package/version installée | Severity de l'avis | Advisory | Plage affectée | Correctif publié | Chaîne |
| --- | --- | --- | --- | --- | --- |
| `postcss@8.4.31` | moderate | [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) — XSS via `</style>` non échappé | `<8.5.10` | `postcss@8.5.23` ou ultérieur | application → `next@15.5.25` → `postcss@8.4.31` |
| `postcss@8.4.31` | high | [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) — lecture arbitraire via `sourceMappingURL` contrôlé | `<=8.5.11` | `postcss@8.5.23` ou ultérieur | application → `next@15.5.25` → `postcss@8.4.31` |
| `postcss@8.4.31` | moderate | [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) — correctif incomplet de la lecture de source maps | `<=8.5.22` | `postcss@8.5.23` ou ultérieur | application → `next@15.5.25` → `postcss@8.4.31` |
| `postcss@8.4.31` | high | [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) — traversal et divulgation de fichiers `.map` | `<=8.5.17` | `postcss@8.5.23` ou ultérieur | application → `next@15.5.25` → `postcss@8.4.31` |
| `deepmerge-ts@7.1.5` | high | [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) — épuisement de pile sur graphes récursifs | `<8.0.0` | `deepmerge-ts@8.0.0` ou ultérieur | application → `prisma@6.19.3` → `@prisma/config@6.19.3` → `deepmerge-ts@7.1.5` |

Remarque : les niveaux individuels des avis PostCSS proviennent du champ `via` du JSON npm. Le total `1 moderate / 4 high` est le comptage agrégé des nœuds de dépendance npm, et non un décompte indépendant des cinq GHSA.

## Arbres npm

```text
para-beauregard
├── next@15.5.25
│   └── postcss@8.4.31       [vulnérable, nœud imbriqué sous Next]
├── @tailwindcss/postcss@4.3.3
│   └── postcss@8.5.26       [non vulnérable]
├── vitest@5.0.0
│   └── vite@8.2.2
│       └── postcss@8.5.26   [non vulnérable, dédupliqué]
└── prisma@6.19.3            [devDependency / CLI]
    └── @prisma/config@6.19.3
        └── deepmerge-ts@7.1.5 [vulnérable]
```

`@prisma/client@6.19.3` est la dépendance runtime. `npm ls` la montre avec `prisma@6.19.3` dédupliqué dans l'arbre local, mais le client runtime n'importe pas le CLI, `@prisma/config` ou `deepmerge-ts` pour les requêtes de l'application.

## Matrice de vulnérabilités

| PACKAGE | SEVERITY | ADVISORY | PARENT | PROD/DEV | IN STANDALONE | REACHABLE | SAFE PATCH AVAILABLE | MAJOR REQUIRED | PRODUCTION BLOCKER |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `deepmerge-ts@7.1.5` | high | GHSA-ggr8-5vv4-36mx | `@prisma/config@6.19.3` | DEV / Prisma CLI | NO | NOT REACHABLE IN PRODUCTION | NO patch compatible démontré sur Prisma 6 ; upstream 8.0.0+ | YES pour audit zéro, via Prisma 7+ séparé | NO |
| `@prisma/config@6.19.3` | high | GHSA-ggr8-5vv4-36mx hérité | `prisma@6.19.3` | DEV / Prisma CLI | NO | NOT REACHABLE IN PRODUCTION | aucune mise à jour compatible démontrée | YES pour audit zéro, via Prisma 7+ séparé | NO |
| `prisma@6.19.3` | high | GHSA-ggr8-5vv4-36mx hérité | dépendance CLI directe | DEV / Prisma CLI | NO | NOT REACHABLE IN PRODUCTION | `prisma@7+` implique une migration majeure | YES pour audit zéro | NO |
| `postcss@8.4.31` | high (nœud npm) | GHSA-qx2v-qp2m-jg93; GHSA-6g55-p6wh-862q; GHSA-fxqj-rqcc-2cmp; GHSA-r28c-9q8g-f849 | `next@15.5.25` | PROD dependency metadata / BUILD ONLY | YES, sous `next/node_modules` | NOT REACHABLE IN PRODUCTION | PostCSS 8.5.23+ existe, mais Next 15.5.25 épingle 8.4.31 ; override non appliqué car non démontré sûr | YES via `next@16.3.4` selon npm | NO |
| `next@15.5.25` | moderate (agrégation npm) | via le PostCSS imbriqué ; aucun GHSA Next indépendant courant | dépendance directe | PROD / surface build | YES | NOT REACHABLE IN PRODUCTION pour ces fonctions PostCSS | aucun patch Next 15 proposé par npm ; npm propose `next@16.3.4` | YES pour audit zéro | NO |

## Reachability

- **PostCSS** : la fonction vulnérable concerne la transformation CSS/source maps. Le projet ne reçoit ni CSS, ni source map, ni fichier contrôlé par l'utilisateur dans une route HTTP, Server Action, API, upload, scraper ou assistant. Les feuilles CSS servies en production sont déjà générées. Classification : **BUILD ONLY / NOT REACHABLE IN PRODUCTION**.
- **deepmerge-ts** : utilisé par `@prisma/config`, lui-même utilisé par le CLI Prisma pour configuration/génération/migration. Aucun chemin applicatif runtime ne l'appelle et il n'est pas dans le standalone. Classification : **PRISMA CLI/TOOLING / NOT REACHABLE IN PRODUCTION**.
- **Prisma runtime** : `@prisma/client@6.19.3` est présent dans le standalone et sert les accès base de données ; aucun des paquets vulnérables signalés n'est chargé par ce chemin runtime. Classification : **runtime Prisma non vulnérable selon cet audit**.
- Aucune vulnérabilité restante n'est classée `REACHABLE` depuis une requête publique, une Server Action, une API route, l'authentification, un upload, le parsing utilisateur, la génération HTML, le scraper ou l'assistant IA dans l'application auditée. Classification globale : **NOT REACHABLE IN PRODUCTION**.

## Présence dans le standalone

Inspection de `.next/standalone/node_modules` après le clean build :

| Package / nœud | PRESENT IN STANDALONE |
| --- | --- |
| `next@15.5.25` | YES |
| `next/node_modules/postcss@8.4.31` | YES |
| `postcss` top-level vulnérable | NO |
| `prisma@6.19.3` | NO |
| `@prisma/config@6.19.3` | NO |
| `deepmerge-ts@7.1.5` | NO |
| `@prisma/client@6.19.3` | YES, runtime et non vulnérable dans cet audit |
| `sharp@0.35.4` | YES, corrigé par le patch sûr et absent des vulnérabilités restantes |

La présence de `postcss` sous le package Next est notée par transparence. L'artefact ne fournit pas de route qui expose son parseur/stringifier à des données CSS ou source maps contrôlées par un visiteur.

## Next.js

Version installée et construite : **Next.js 15.5.25**.

Le rapport JSON ne contient pas d'avis indépendant propre au code de Next.js 15.5.25 ; le nœud `next` est marqué `moderate` uniquement parce que son package imbriqué `postcss@8.4.31` est affecté. Le correctif automatique proposé par npm est `next@16.3.4` et est explicitement marqué breaking. Aucune migration Next.js 16 n'est justifiée pour cette release.

## Prisma

- Runtime : `@prisma/client@6.19.3`, présent dans le standalone ; aucune des vulnérabilités restantes ne cible le client runtime dans le chemin exécuté.
- Tooling : `prisma@6.19.3` → `@prisma/config@6.19.3` → `deepmerge-ts@7.1.5`, absent du standalone et utilisé pour CLI/configuration/génération/migrations.
- Le correctif structurel de cette chaîne est une évolution Prisma majeure vers une ligne compatible avec `deepmerge-ts@8+`. Elle n'a pas été appliquée.

## Safe updates applied

Le seul correctif appliqué avant cet audit final est le patch non majeur recommandé par npm :

- `next` : `15.5.23` → `15.5.25`.
- `@next/env` / `@next/swc` : `15.5.23` → `15.5.25`.
- `sharp` : `0.34.5` → `0.35.4`.
- dépendances WASM Sharp associées mises à jour selon le lockfile.

Ce patch a été suivi par les tests, le build et le smoke test standalone. Aucun override aveugle n'a été ajouté. Aucun patch additionnel sûr ne ressort de `npm audit fix --dry-run` pour les cinq nœuds restants ; le dry-run ne propose que des ajustements déjà liés à Sharp/WASM et conserve les cinq avis.

## Validation finale

- TypeScript : **OK** (`npm run typecheck`).
- ESLint : **OK** (`npm run lint`).
- Unit tests : **118/118** après ajout des contrôles réputation.
- E2E complet : **41/41** après ajout du contrôle d’état sans réputation.
- Build production : **code 0**, Next.js 15.5.25.
- Standalone smoke test : routes principales `200`, `/api/health` `200`, base de données `ok`, aucun secret exposé dans la réponse health.

## Conclusion

Les cinq alertes npm restantes sont documentées. Elles ne sont pas démontrées comme atteignables depuis le runtime de production de cette application et aucune vulnérabilité critique ne subsiste. La résolution à zéro alerte nécessiterait des migrations majeures séparées (Next.js 16.3.4 et Prisma 7+), non nécessaires au verdict de cette release et volontairement non effectuées.

## ACCEPTED RISK

Les 5 alertes npm restantes sont connues et documentées.

Aucune n'est actuellement démontrée comme atteignable dans le runtime applicatif de production.

Elles seront réévaluées lors d'une future migration majeure séparée.

Ce constat ne signifie pas que le risque est nul.

## Firecrawl ajouté après l’audit V7

Le SDK Firecrawl était déjà présent dans le lockfile et aucune nouvelle dépendance n’a été ajoutée pour la réputation. La clé reste server-side. Les résultats sont filtrés, dédupliqués et mis en cache ; aucune route publique ne peut déclencher une recherche Firecrawl. Le test manuel limité à une requête a réussi sans exposer la clé dans les journaux.
