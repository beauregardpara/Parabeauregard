# 🎨 Prompts Gemini — Photos du site Para Beauregard en style 3D

Ce document contient **tous les prompts prêts à copier-coller dans Gemini** (ou Google AI Studio /
Whisk / ImageFX) pour générer les visuels du site dans un style **rendu 3D professionnel**.

---

## 📋 Mode d'emploi

1. Ouvrez [gemini.google.com](https://gemini.google.com) et démarrez une conversation.
2. Pour chaque image ci-dessous : collez le **bloc de style** + la **description** demandée.
3. Téléchargez le résultat et enregistrez-le avec le **nom de fichier indiqué** au bon endroit :
   - Visuels produits → `public/products/<nom>.png`
   - Visuels catégories → `public/categories/<nom>.png`
4. Quand toutes vos images sont en place, lancez :

```bash
npm run images:swap
```

Le site basculera automatiquement de ses illustrations actuelles vers vos nouvelles photos 3D.
Astuce : générez plusieurs variantes et gardez la plus belle. Demandez toujours
« génère une autre variante » si un résultat ne vous plaît pas.

> 💡 **Transparence** : Gemini ne produit pas de fond transparent fiable. C'est prévu :
> tous les prompts imposent le fond menthe très clair `#F2FBF7`, identique au fond du site —
> les images se fondront donc naturellement dans les pages.

---

## 🎯 BLOC DE STYLE — à coller au début de CHAQUE prompt

```
STYLE (obligatoire) : rendu 3D publicitaire haut de gamme, style "clay render" doux associé à des
matériaux réalistes (plastique satiné, verre dépoli, or mat). Éclairage studio doux et diffus,
ombres portées délicates et réalistes, légère lumière d'accent teal sur les bords.
Palette : vert émeraude désaturé #12A893, menthe #96EDDA, blanc cassé #FDFFFE,
touches de corail #FF8F6B uniquement en accent. Fond uni vert menthe très clair #F2FBF7.
Composition centrée, aérée, look premium de parapharmacie moderne (type pub Apple x Sephora).
INTERDIT : aucun texte, aucune lettre, aucun logo de marque existante, aucun visage humain,
pas de watermark. Format carré 1:1, très haute définition, net.
```

*(Pour les 2 visuels grand format, remplacez la dernière ligne par : « format 16:9 horizontal ».)*

---

## 1️⃣ Visuel principal du HERO (grande image d'accueil)

📁 À enregistrer : `public/products/hero-main.png`

```
[BLOC DE STYLE]

SUJET : composition de produits de parapharmacie flottant en apesanteur : au centre un tube de
crème solaire élégant sans marque, autour de lui disposés en orbite un pot de crème en verre,
un flacon compte-gouttes ambré, un flacon pompe blanc et une boîte de gélules ouverte dont
quelques gélules s'échappent. Chaque objet tourne légèrement sur lui-même avec un mouvement
figé gracieux, petites feuilles d'eucalyptus et gouttelettes d'eau en suspension autour.
Profondeur de champ cinématographique, arrière-plan légèrement flouté. Format 16:9 horizontal.
```

## 2️⃣ Packshots produits (10 images — remplacent les illustrations actuelles)

Chaque prompt suit le même gabarit. Copiez le BLOC DE STYLE + la ligne SUJET correspondante.

| Fichier | SUJET à ajouter après le bloc de style |
|---|---|
| `cream-jar.png` | SUJET : un pot de crème hydratante luxueux en verre dépoli blanc avec couvercle doré mat, couvercle entrouvert laissant voir la texture crème onctueuse, posé sur un socle rond en pierre claire. |
| `serum-dropper.png` | SUJET : un flacon compte-gouttes en verre ambré translucide, pipette inclinée au-dessus laissant tomber une goutte qui scintille, reflets verts subtils dans le verre. |
| `pump-bottle.png` | SUJET : un flacon pompe cylindrique blanc mat minimaliste, une noisette de mousse légère sortant de la pompe, gouttes perlées sur le flacon. |
| `flacon.png` | SUJET : une grande bouteille d'eau micellaire translucide bleutée aux courbes douces, étiquette vierge blanche épurée, bouchon rose corail. |
| `tube-solaire.png` | SUJET : un tube de crème solaire couché avec un cordonnet de crème blanche sorti du tube formant une spirale élégante, petit soleil 3D stylisé en relief flottant derrière lui. |
| `spray.png` | SUJET : un vaporisateur transparent rempli de liquide menthe, brume fine pulvérisée figée dans l'air illuminée par un rayon de lumière, gouttelettes scintillantes. |
| `pilules.png` | SUJET : une boîte de gélules ouverte en perspective, gélules deux tons blanc et menthe s'échappant en arc de cercle, quelques-unes en apesanteur. |
| `boite-soins.png` | SUJET : une boîte de compléments alimentaires élégante ouverte, plaquette thermoformée argentée visible, comprimés effervescents posés devant, bulles fines autour. |
| `biberon.png` | SUJET : un biberon bébé ultra-doux aux courbes rondes, tétine en silicone laiteux, lait vanillé à moitié rempli, ourson en peluche miniature 3D assis à côté. |
| `savon.png` | SUJET : un pain de savon artisanal crème avec des fleurs de calendula séchées incrustées, mousse soyeuse au premier plan, serviette roulée floue en arrière-plan. |

## 3️⃣ Scènes catégories (6 images — tuiles de la page d'accueil)

📁 À enregistrer dans : `public/categories/`
Ajoutez après le bloc de style : « Composition en scène ouverte légèrement plongée, style
vitrine de boutique, objets groupés harmonieusement. Format carré 1:1. »

| Fichier | SUJET |
|---|---|
| `soins-visage.png` | SUJET : rituel de soins du visage — pot de crème, sérum, masque frais en texture ondulée, tranches de concombre 3D stylisées, fleur de coton, tout en douceur spa. |
| `soins-cheveux.png` | SUJET : routine capillaire — flacons shampooing aux teintes menthe, brosse à cheveux en bois clair, boucle de cheveux brillants 3D stylisée, gouttes d'huile dorée en suspension. |
| `protection-solaire.png` | SUJET : univers solaire estival — tubes et sprays solaires, chapeau de paille miniatures, lunettes de soleil rondes, sable fin et coquillage, soleil doux en relief au fond. |
| `complements-alimentaires.png` | SUJET : bien-être de l'intérieur — pots de gélules, orange coupée, citron, amandes, feuilles vertes, pilulier élégant, ambiance vitalité fraîche. |
| `hygiene-corps.png` | SUJET : rituel douche — flacons gel douche et lotion, éponge de konjac, fleurs d'oranger, mousse généreuse, serviettes blanches roulées. |
| `bebe-maman.png` | SUJET : univers bébé tendre — lait bébé, biberon, petits jouets pastel, couverture tricotée crème, nuage moelleux 3D, ambiance douce et rassurante. |

## 4️⃣ Bonus recommandés

| Fichier | Emplacement | Prompt (après le bloc de style) |
|---|---|---|
| `ai-assistant.png` | `public/` | SUJET : un petit assistant virtuel mignon en forme de bulle de soin arrondie vert menthe avec de grands yeux brillants et un sourire discret, tenant un flacon de sérum, aura lumineuse douce, style mascotte 3D Pixar. Format 1:1. |
| `og-image.png` | `public/` | Reprenez le prompt du HERO (1️⃣) en ajoutant : « composition légèrement plus resserrée, adaptée à une vignette de partage ». Format 16:9, 1200×630. |
| `livraison.png` | `public/categories/…` non requis | SUJET : une petite moto de livraison 3D stylisée couleur menthe avec une caisse isotherme à l'arrière, colis parapharmacie soigneusement rangés, route stylisée minimaliste, petites feuilles volantes. Format 16:9. |

---

## ✅ Après génération — checklist

```bash
# 1. Vérifiez que les .png sont bien dans public/products/ et public/categories/
dir public\products\*.png

# 2. Basculez la base de données vers les nouvelles images
npm run images:swap

# 3. Rechargez http://localhost:3000 — c'est magique ✨
```

Les anciens `.svg` restent en place comme secours : supprimez simplement un `.png`
puis relancez `npm run db:seed` + `npm run images:swap` pour revenir en arrière.
