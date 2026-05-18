# Script de test WorldMap

## Description

Ce script teste automatiquement que les corrections de la carte mondiale fonctionnent correctement.

## Utilisation

```bash
npm run test:worldmap
```

Ou directement :

```bash
node scripts/test-worldmap-corrections.js
```

## Tests effectués

1. **Structure France** : Vérifie que la France a bien 3 polygones (Guyane + Métropole + Corse)
2. **Analyse polygones** : Identifie chaque territoire et vérifie le filtrage
3. **Présence USA** : Confirme que les États-Unis sont présents (ID: 840)
4. **Simulation filtrage** : Simule la fonction `processFranceGeometry` et vérifie le résultat

## Résultat attendu

```
🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !

📋 Résumé :
  ✅ Structure France : 3 polygones (Guyane + Métropole + Corse)
  ✅ Filtrage : Guyane supprimée, 2 polygones restants
  ✅ USA : Toujours présent dans les données
```

## En cas d'échec

Si un test échoue, le script affichera :
- ❌ Le test qui a échoué
- Le message d'erreur détaillé
- Un code de sortie non nul (exit code 1)

## Dépendances

- `fs` : Lecture du fichier world-110m.json
- `topojson-client` : Conversion TopoJSON vers GeoJSON

Ces dépendances sont déjà installées dans le projet.

