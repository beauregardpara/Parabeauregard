# Para Beauregard — Gestion des Ventes

Application Windows locale pour enregistrer les ventes, suivre le bénéfice quotidien et piloter l’objectif de 200 DH par jour.

## Utilisation

Lancer `ParaBeauregard.GestionVentes.exe` depuis le dossier `publish`.

- Les ventes et produits sont enregistrés dans SQLite, dans `%LOCALAPPDATA%\ParaBeauregard\ventes.db`.
- Une copie de sauvegarde est créée automatiquement après chaque enregistrement ou suppression dans `%LOCALAPPDATA%\ParaBeauregard\backups`.
- Le moteur recalcule les jours suivants après toute modification ou suppression historique.
- Les exports CSV et XLSX sont disponibles dans **Sauvegardes**.

## Fonctions incluses

Dashboard quotidien, saisie/édition/suppression des ventes, catalogue avec préremplissage, historique, suivi journalier avec jours sans vente, statistiques, sauvegarde/restauration, exports CSV/XLSX et paramétrage de l’objectif.

## Développement

```powershell
dotnet restore
dotnet build -c Release
dotnet run --project ..\para-beauregard-desktop.Tests\ParaBeauregard.Desktop.Tests.csproj -c Release
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o publish
```

L’application est native WinForms .NET 9 et ne nécessite pas d’installation du runtime .NET sur le poste cible.
