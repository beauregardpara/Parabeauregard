# Para Beauregard — guide d'exploitation quotidienne

Guide pour l'équipe qui gère la boutique au quotidien. Aucune manipulation de la
base de données n'est nécessaire : tout se fait depuis l'administration.

- Boutique : https://para-beauregard.vercel.app
- Administration : https://para-beauregard.vercel.app/admin

> Ne jamais écrire un mot de passe, une clé API ou une adresse de base de données
> dans ce document, dans un ticket, un chat ou un email.

## 1. Se connecter

1. Ouvrir `/admin/login` et saisir son email et son mot de passe personnels.
2. Un compte = une personne. Ne partagez pas vos identifiants.
3. Terminer la session avec **Déconnexion** (bouton en bas à droite ou dans le menu).
4. Mot de passe perdu (administrateur) : demander à la personne qui gère le serveur
   d'exécuter `npm run admin:reset-password -- --email <email>` (voir
   `docs/PRODUCTION-RUNBOOK.md`). Les clients, eux, utilisent « Mot de passe oublié ? ».

Rôles :

| Rôle | Accès |
| --- | --- |
| Super-admin | Tout, y compris utilisateurs, journal et système |
| Gestionnaire catalogue | Produits, catégories, avis, codes promo, scraper, qualité |
| Gestionnaire commandes | Tableau de bord, commandes, retours, clients (lecture produits) |

Les comptes et rôles se gèrent dans **Utilisateurs** (super-admin). Désactivez un
compte dès qu'une personne quitte l'équipe (bouton « Actif » → « Inactif »).

## 2. Tableau de bord

Chiffres calculés uniquement sur les vraies commandes (hors annulées) :
commandes et CA du jour (heure de Casablanca), CA 7 et 30 jours, commandes
**à traiter** (reçues + en préparation), produits en **stock faible**, ruptures,
derniers messages de contact et dernières commandes.

## 3. Produits

### Ajouter un produit
1. **Produits → + Ajouter**.
2. Renseigner : nom, marque, catégorie, prix (DH), prix promo (facultatif), stock,
   seuil d'alerte, référence (SKU), descriptions.
3. Statut : **À valider** (brouillon), **Publié** (visible et commandable) ou
   **Masqué** (retiré de la boutique).
4. Enregistrer, puis ajouter les images (section Images).

### Modifier un produit
Ouvrir le produit depuis la liste (recherche par nom, marque, référence ou numéro),
modifier, puis **Enregistrer les modifications**. Les changements de prix et de stock
sont historisés automatiquement.

### Images
- Formats acceptés : JPEG, PNG, WEBP — 5 Mo maximum par image.
- Glisser-déposer ou « choisir un fichier ». Les images sont stockées dans Supabase.
- La première image est la couverture : utilisez « définir comme couverture » ou
  réordonnez les images, puis **Enregistrer**.
- « Supprimer cette image » puis **Enregistrer** retire aussi le fichier du stockage.

### Stock
- Modifier le champ **Stock** sur la fiche. Le stock ne peut pas devenir négatif :
  chaque commande vérifie le stock réel au moment de la validation.
- **Stock illimité** : à réserver aux produits toujours disponibles.
- Filtres de la liste : **Stock faible** (≤ seuil configuré) et **En rupture**.
- Un produit en rupture reste visible mais ne peut pas être commandé.

### Archiver / republier
- **Archiver ce produit** le passe en « Masqué » : il disparaît de la boutique, de la
  recherche, du sitemap et de l'assistant, mais reste dans l'administration et dans
  l'historique des commandes.
- Pour le remettre en vente : ouvrir la fiche, statut **Publié**, enregistrer.
- Préférez toujours l'archivage à la suppression.

## 4. Commandes

Paiement accepté : **à la livraison (espèces)** uniquement.

1. **Commandes** : filtrer par statut ou rechercher par référence (PB-…), téléphone,
   nom ou email.
2. Ouvrir une commande : client, téléphone, adresse, articles, sous-total, livraison,
   remise, total à encaisser, notes du client, historique des statuts.
3. Cycle de vie :

| Statut | Signification | Étapes suivantes possibles |
| --- | --- | --- |
| Reçue | Nouvelle commande, à confirmer par téléphone | En préparation, Annulée |
| En préparation | Confirmée avec le client, colis en cours | Expédiée, Annulée |
| Expédiée | Remise au livreur | Livrée, Annulée |
| Livrée | Terminée | — |
| Annulée | Terminée | — |

- Appelez le client pour confirmer avant de passer en **En préparation**.
- **Annuler** remet automatiquement le stock, retire les points de fidélité et libère
  le code promo utilisé. Une commande livrée ou annulée ne peut plus changer de statut.
- Le bon de livraison s'imprime depuis la fiche commande (impression du navigateur).
- Ne supprimez jamais une commande réelle.

## 5. Clients, retours, avis

- **Clients** : recherche par nom, email ou téléphone ; nombre de commandes et CA.
- **Retours** : accepter ou refuser les demandes, avec un message au client.
- **Avis clients** : modérer avant publication.

## 6. Promotions

- **Prix promo** sur une fiche produit : le prix barré s'affiche et le panier utilise
  le prix promo. Videz le champ pour arrêter la promotion.
- **Codes promo** : pourcentage ou montant fixe, montant minimum, dates de début et
  de fin, nombre d'utilisations. Un code peut être désactivé à tout moment.
- N'affichez jamais une réduction qui n'est pas réellement appliquée.

## 7. Messages et notifications

- Les messages du formulaire de contact apparaissent sur le tableau de bord et dans
  le **Journal d'activité**, et sont envoyés par email à la parapharmacie.
- Chaque nouvelle commande envoie un email de notification à la parapharmacie et un
  email de confirmation au client (s'il a donné son email).
- Tant que le domaine d'envoi n'est pas vérifié chez Resend, ces emails peuvent ne
  pas partir : consultez **Système & santé**, et suivez les commandes directement
  dans l'administration.

## 8. Vérifier que tout va bien

- **Système & santé** : base de données, configuration email, journaux d'emails.
- Santé publique : `https://para-beauregard.vercel.app/api/health` doit afficher
  `"status":"ok"` et le nombre de produits publiés.
- GitHub → Actions : « Production health check » (toutes les 3 heures) et
  « Production database and storage backup » (chaque nuit) doivent être verts.
  GitHub envoie un email en cas d'échec.

## 9. À ne pas faire

- Ne pas supprimer de produits ou de commandes réels : archiver ou annuler.
- Ne pas modifier la base de données à la main.
- Ne pas publier une fiche sans prix, stock ni image vérifiés.
- Ne pas donner de conseil médical (médicament, antibiotique, posologie) : orienter
  vers un pharmacien ou un médecin. L'assistant du site applique la même règle.
- Ne pas partager d'identifiants et ne pas réutiliser les comptes de démonstration.
- Ne pas lancer le scraper sans raison : chaque exécution peut consommer des crédits
  payants (Firecrawl).
