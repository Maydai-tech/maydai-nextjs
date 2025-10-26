# 🧪 Instructions de test - Corrections carte mondiale

## ✅ Tests automatiques : TOUS PASSÉS

Les tests automatiques ont validé que la logique fonctionne correctement :

```bash
npm run test:worldmap
# OU
node scripts/test-worldmap-corrections.js
```

**Résultats des tests automatiques** :
- ✅ Structure France : 3 polygones détectés (Guyane + Métropole + Corse)
- ✅ Filtrage : Guyane correctement supprimée, 2 polygones restants
- ✅ USA : Toujours présent dans les données avec ID 840

---

## 🖥️ Tests visuels à effectuer

### Préparation
1. L'application tourne déjà sur `localhost:3000`
2. Ouvrir le navigateur et aller sur une page avec un use case

### Test 1 : Guyane invisible ⏳

**Objectif** : Vérifier que la Guyane française n'apparaît plus sur la carte

**Étapes** :
1. Aller sur n'importe quelle page use case avec une carte
2. Regarder la côte nord-est de l'Amérique du Sud (entre le Brésil et le Suriname)
3. Chercher s'il y a un territoire en bleu-vert dans cette zone

**Résultat attendu** :
- ❌ AUCUN territoire français ne doit apparaître en Amérique du Sud
- ✅ Seuls le Brésil, Suriname, Venezuela doivent être visibles (en gris)

**Coordonnées approximatives de la Guyane** :
- Entre 51°W et 55°W de longitude
- Entre 2°N et 6°N de latitude

---

### Test 2 : États-Unis visibles ⏳

**Objectif** : Vérifier que les États-Unis sont bien visibles sur la carte

**Étapes** :
1. Sur la même page use case, regarder l'Amérique du Nord
2. Vérifier que les États-Unis sont visibles

**Résultat attendu** :
- ✅ Les États-Unis doivent être visibles
- Si "USA" n'est PAS dans les pays de déploiement : en **gris clair**
- Si "USA" EST dans les pays de déploiement : en **bleu-vert**

---

### Test 3 : France métropolitaine uniquement colorée ⏳

**Objectif** : Vérifier que seule la France métropolitaine est colorée quand "France" est sélectionnée

**Étapes** :
1. Aller sur un use case avec "France" comme pays de déploiement
2. Observer la carte mondiale
3. Vérifier qu'il n'y a pas d'autres territoires français colorés ailleurs

**Résultat attendu** :
- ✅ France métropolitaine (en Europe) : colorée en **bleu-vert**
- ✅ Corse (petite île à l'est de la France) : colorée en **bleu-vert**
- ❌ Guyane (Amérique du Sud) : **INVISIBLE**
- ❌ Guadeloupe/Martinique (Caraïbes) : **INVISIBLE**
- ❌ Réunion (Océan Indien) : **INVISIBLE**

---

### Test 4 : Vue Europe correcte ⏳

**Objectif** : Vérifier que la vue Europe montre bien toute l'Europe

**Étapes** :
1. Aller sur un use case avec un ou plusieurs pays européens (France, Allemagne, etc.)
2. Attendre que la carte zoome automatiquement (animation de 750ms)
3. Observer la zone visible

**Résultat attendu** :
- ✅ Badge "Europe" visible en haut à droite de la carte
- ✅ Tous les pays européens sont visibles :
  - Portugal (à l'ouest)
  - Royaume-Uni (nord-ouest)
  - Pays scandinaves (Norvège, Suède, Finlande au nord)
  - Russie occidentale (à l'est)
  - Espagne et Italie (sud)
- ✅ La vue n'est pas trop zoomée (on voit bien l'ensemble de l'Europe)

---

### Test 5 : Zoom Amérique du Nord ⏳

**Objectif** : Vérifier que le zoom fonctionne pour d'autres régions

**Étapes** :
1. Aller sur un use case avec "USA" ou "Canada" comme pays de déploiement
2. Observer le zoom automatique

**Résultat attendu** :
- ✅ Badge "Amérique du Nord" visible
- ✅ Canada et USA bien visibles
- ✅ Pas de territoire français visible en Amérique du Sud

---

### Test 6 : Tooltips ⏳

**Objectif** : Vérifier que les infobulles fonctionnent correctement

**Étapes** :
1. Survoler un pays coloré en bleu-vert avec la souris
2. Observer l'infobulle qui apparaît

**Résultat attendu** :
- ✅ Infobulle s'affiche au survol
- ✅ Affiche le nom du pays
- ✅ Affiche le nombre de cas d'usage (ex: "2 cas d'usages")
- ✅ L'infobulle suit le curseur

---

### Test 7 : Console navigateur ⏳

**Objectif** : Vérifier qu'il n'y a pas d'erreurs JavaScript

**Étapes** :
1. Ouvrir la console du navigateur (F12 ou clic droit > Inspecter)
2. Aller dans l'onglet "Console"
3. Recharger la page avec une carte

**Résultat attendu** :
- ✅ Aucune erreur rouge
- ✅ Aucun warning concernant D3.js ou WorldMap
- ⚠️ Quelques warnings sans rapport peuvent exister (ignorables)

---

### Test 8 : Responsive ⏳

**Objectif** : Vérifier que la carte reste fonctionnelle sur mobile

**Étapes** :
1. Ouvrir les outils développeur (F12)
2. Activer le mode responsive (icône mobile/tablette)
3. Tester différentes tailles d'écran

**Résultat attendu** :
- ✅ La carte s'adapte à la largeur de l'écran
- ✅ Les pays restent cliquables/survolables
- ✅ Les tooltips restent visibles
- ✅ Le zoom fonctionne toujours

---

## 📋 Checklist finale

Une fois tous les tests effectués, cocher chaque item :

- [ ] **Test 1** : Guyane invisible ✓
- [ ] **Test 2** : USA visibles ✓
- [ ] **Test 3** : France métropolitaine uniquement ✓
- [ ] **Test 4** : Vue Europe correcte ✓
- [ ] **Test 5** : Zoom Amérique du Nord ✓
- [ ] **Test 6** : Tooltips fonctionnels ✓
- [ ] **Test 7** : Aucune erreur console ✓
- [ ] **Test 8** : Responsive OK ✓

---

## 🐛 En cas de problème

### Si la Guyane apparaît encore
1. Vider le cache du navigateur (Ctrl+Shift+R ou Cmd+Shift+R)
2. Vérifier que le fichier `WorldMap.tsx` a bien été modifié
3. Redémarrer le serveur de développement

### Si les USA sont invisibles
1. Ouvrir la console et chercher des erreurs D3.js
2. Vérifier que le fichier `world-110m.json` n'a pas été modifié
3. Re-tester avec le script : `node scripts/test-worldmap-corrections.js`

### Si la vue Europe est bizarre
1. Vérifier que la page se charge complètement (attendre 1-2 secondes)
2. Essayer de zoomer/dézoomer manuellement avec la molette
3. Recharger la page

### Erreurs dans la console
1. Copier le message d'erreur complet
2. Prendre une capture d'écran
3. Signaler le problème avec ces informations

---

## 📁 Fichiers modifiés

### Fichier principal
- `components/WorldMap.tsx` - Logique de filtrage des DOM-TOM

### Fichiers de documentation
- `CORRECTIONS_CARTE_MONDIALE.md` - Documentation technique détaillée
- `INSTRUCTIONS_TEST_CARTE.md` - Ce fichier (instructions de test)
- `scripts/test-worldmap-corrections.js` - Script de test automatique

---

## 🚀 Prochaines étapes

Une fois tous les tests validés :

1. **Si tout fonctionne** :
   ```bash
   git add components/WorldMap.tsx CORRECTIONS_CARTE_MONDIALE.md scripts/test-worldmap-corrections.js
   git commit -m "fix: Correction carte mondiale - masquage DOM-TOM et affichage USA"
   ```

2. **Si des problèmes persistent** :
   - Noter exactement quels tests échouent
   - Prendre des captures d'écran
   - Signaler pour investigation supplémentaire

---

## 💡 Rappel des corrections effectuées

1. **Guyane supprimée** : La fonction `processFranceGeometry` analyse les coordonnées géographiques de chaque polygone de la France et ne garde que ceux situés en Europe

2. **USA affichés** : Suppression des filtres géographiques défectueux qui excluaient accidentellement les États-Unis

3. **Vue Europe corrigée** : Nouveaux paramètres de centre, échelle et bounds pour une meilleure visualisation

---

**Bonne chance pour les tests ! 🎯**

