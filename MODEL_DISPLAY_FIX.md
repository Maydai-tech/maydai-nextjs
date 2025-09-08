# 🔧 Correction de l'affichage des modèles dans le dashboard

## 🎯 Problème identifié

Les informations du modèle (nom et logo) ne s'affichent pas correctement dans les cartes du dashboard car :

1. **Migration manquante** : La colonne `primary_model_id` n'existe pas dans la table `usecases`
2. **Données non liées** : Les cas d'usage existants ne sont pas liés aux modèles COMPL-AI
3. **API incomplète** : La relation `compl_ai_models` n'est pas récupérée

## ✅ Solutions implémentées

### 1. **Migration SQL créée**
- **Fichier** : `supabase/migrations/20250724_add_usecase_model_relation.sql`
- **Action** : Ajoute la colonne `primary_model_id` avec relation vers `compl_ai_models`

### 2. **Script de migration des données**
- **Fichier** : `scripts/migrate-usecase-models.sql`
- **Action** : Lie automatiquement les modèles existants basés sur `technology_partner` et `llm_model_version`

### 3. **API mise à jour**
- **Fichier** : `app/api/companies/[id]/usecases/route.ts`
- **Action** : Récupère les données du modèle via la relation `compl_ai_models`

### 4. **Interface améliorée**
- **Fichier** : `app/dashboard/[id]/page.tsx`
- **Action** : Affiche les vraies données du modèle avec fallback sur les champs existants

## 🚀 Déploiement

### Option 1 : Script automatique
```bash
./scripts/deploy-model-relation.sh
```

### Option 2 : Manuel
```bash
# 1. Appliquer la migration
supabase db push

# 2. Migrer les données
supabase db reset --linked

# 3. Vérifier
supabase db reset --linked
```

## 🔍 Vérification

### Dans Supabase SQL Editor :
```sql
-- Vérifier que la colonne existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usecases' 
AND column_name = 'primary_model_id';

-- Vérifier les mappings
SELECT 
    COUNT(*) as total_usecases,
    COUNT(primary_model_id) as mapped_usecases,
    ROUND(COUNT(primary_model_id)::numeric / COUNT(*)::numeric * 100, 2) as mapping_percentage
FROM usecases;
```

### Dans l'application :
1. Aller sur le dashboard d'une entreprise
2. Vérifier que les cartes "Modèle utilisé" affichent :
   - Le nom du modèle (ex: "Claude Opus 3")
   - Le provider (ex: "Anthropic")
   - L'icône du provider (ex: "A")

## 🎨 Améliorations apportées

### **Affichage intelligent** :
- **Priorité 1** : Données COMPL-AI (`compl_ai_models`)
- **Priorité 2** : Champs existants (`llm_model_version`, `technology_partner`)
- **Fallback** : "Modèle non renseigné"

### **Icônes dynamiques** :
- Première lettre du provider (A pour Anthropic, G pour Google, etc.)
- Couleurs dégradées pour l'icône

### **Messages conditionnels** :
- **"À compléter"** : "Disponible après évaluation"
- **Modèle renseigné** : Nom et provider du modèle
- **Pas de modèle** : "Modèle non renseigné"

## 🔄 Prochaines étapes

1. **Appliquer la migration** en production
2. **Migrer les données** existantes
3. **Tester l'affichage** sur tous les cas d'usage
4. **Optionnel** : Ajouter des icônes spécifiques par provider

## 📊 Résultat attendu

Après déploiement, les cartes du dashboard devraient afficher :

```
┌─────────────────────────────────────┐
│ Modèle utilisé                      │
│ 🤖 Claude Opus 3                    │
│    Anthropic                        │
└─────────────────────────────────────┘
```

Au lieu de :
```
┌─────────────────────────────────────┐
│ Modèle utilisé                      │
│ Modèle non renseigné                │
└─────────────────────────────────────┘
```
