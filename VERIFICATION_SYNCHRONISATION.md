# Vérification de la Synchronisation des Données

## 🎯 Problème Identifié

Les données affichées dans le dashboard ne correspondent pas à celles de la page détaillée du cas d'usage "Trieur de CV" :

- **Dashboard** : Score = 0, "Risque Inacceptable", "Éliminé"
- **Page détaillée** : Score = 73, "Risque Limité"

## 🔍 Cause Racine

Les deux vues utilisent des APIs différentes :
- **Dashboard** : `/api/companies/[id]/usecases`
- **Page détaillée** : `/api/usecases/[id]`

Ces APIs peuvent retourner des données différentes ou non synchronisées.

## 🛠️ Solution

### 1. Vérification des APIs
- ✅ **API Dashboard** : Récupère toutes les colonnes (`*`) incluant `score_final` et `risk_level`
- ✅ **API Page détaillée** : Récupère toutes les colonnes (`*`) incluant `score_final` et `risk_level`

### 2. Logs de Debug Ajoutés
- ✅ **API Dashboard** : Logs pour voir tous les cas d'usage récupérés
- ✅ **Dashboard Frontend** : Logs pour voir les données reçues

### 3. Synchronisation des Données
Les données doivent être synchronisées en base de données. Si elles ne le sont pas :

1. **Aller sur la page détaillée** du cas d'usage "Trieur de CV"
2. **Cliquer sur "Réévaluer le cas d'usage"**
3. **Attendre que le calcul se termine**
4. **Retourner au dashboard**
5. **Vérifier que les données sont maintenant identiques**

## ✅ Résultat Attendu

Les deux vues doivent afficher **EXACTEMENT** les mêmes données :

### Si le cas est éliminé :
- **Score de conformité** : 0
- **Niveau IA Act** : "Risque Inacceptable"
- **Statut** : "Éliminé"

### Si le cas est valide :
- **Score de conformité** : 73
- **Niveau IA Act** : "Risque Limité"
- **Statut** : "Complété"

## 🔍 Vérifications

1. **Recharger le dashboard** (Ctrl+F5)
2. **Vérifier les logs du serveur** pour voir les données récupérées
3. **Comparer avec la page détaillée** pour confirmer la cohérence

## 🚨 Si le Problème Persiste

1. **Vérifier les logs** : Regarder les logs du serveur pour voir quels cas d'usage sont récupérés
2. **Vérifier l'entreprise** : S'assurer que le cas d'usage "Trieur de CV" est dans la bonne entreprise
3. **Vérifier la base** : Vérifier que les colonnes `score_final` et `risk_level` sont bien remplies
4. **Forcer le recalcul** : Utiliser le bouton "Réévaluer le cas d'usage" dans la page détaillée

## 🎯 Objectif

Avoir une synchronisation parfaite entre le dashboard et la page détaillée du cas d'usage.
