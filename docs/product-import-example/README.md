# Import catalogue produits

Créez un fichier ZIP avec cette structure :

```text
mon-import.zip
├── products.json
└── images/
    └── creme-hydratante-exemple.webp
```

Le fichier `products.json` peut être copié depuis l’exemple fourni. Chaque valeur de `images` doit correspondre exactement au chemin d’une image dans le ZIP. Formats photo acceptés : JPEG, PNG ou WEBP, jusqu’à 12 photos par produit.

Les catégories peuvent être indiquées par `categoryId`, `categorySlug` ou `categoryName`. Un produit importé est créé en `PENDING_REVIEW` par défaut afin d’être vérifié avant publication. Les doublons de slug ou de SKU sont refusés par les validations existantes.

Un fichier JSON seul est aussi accepté pour importer les données sans photos. Pour importer les photos, utilisez le ZIP.
