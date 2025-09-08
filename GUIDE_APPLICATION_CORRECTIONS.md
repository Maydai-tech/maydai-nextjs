# 🚀 Guide d'application des corrections - Affichage des modèles

## 📋 Étapes à suivre

### 1. **Appliquer la migration SQL**

#### Option A : Via Supabase Dashboard (Recommandé)
1. Aller sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionner votre projet
3. Aller dans **SQL Editor**
4. Copier le contenu du fichier `scripts/apply-migration-manual.sql`
5. Coller dans l'éditeur SQL
6. Cliquer sur **Run** pour exécuter

#### Option B : Via Supabase CLI (si installé)
```bash
# Dans le terminal, depuis le dossier du projet
supabase db push
```

### 2. **Vérifier l'application des corrections**

#### Dans Supabase SQL Editor :
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

#### Dans l'application :
1. Aller sur le dashboard d'une entreprise
2. Vérifier que les cartes "Modèle utilisé" affichent :
   - ✅ Le **vrai logo** du provider (ex: logo Anthropic)
   - ✅ Le **nom du modèle** (ex: "Claude Opus 3")
   - ✅ Le **nom du provider** (ex: "Anthropic")

### 3. **Résultat attendu**

#### Avant les corrections :
```
┌─────────────────────────────────────┐
│ Modèle utilisé                      │
│ Modèle non renseigné                │
└─────────────────────────────────────┘
```

#### Après les corrections :
```
┌─────────────────────────────────────┐
│ Modèle utilisé                      │
│ [Logo Anthropic] Claude Opus 3      │
│                    Anthropic        │
└─────────────────────────────────────┘
```

## 🔧 Dépannage

### Si les logos ne s'affichent pas :
1. Vérifier que les fichiers existent dans `/public/icons_providers/`
2. Vérifier la console du navigateur pour les erreurs 404
3. S'assurer que le provider est correctement mappé

### Si les modèles ne sont pas liés :
1. Exécuter à nouveau le script de migration
2. Vérifier que les noms dans `technology_partner` et `llm_model_version` correspondent aux modèles COMPL-AI
3. Ajouter des mappings manuels si nécessaire

### Si l'API ne retourne pas les données :
1. Vérifier que la relation `compl_ai_models` est correctement définie
2. Tester l'API directement : `GET /api/companies/[id]/usecases`
3. Vérifier les logs du serveur

## 📊 Vérification finale

### Checklist de validation :
- [ ] Colonne `primary_model_id` ajoutée à la table `usecases`
- [ ] Index `idx_usecases_primary_model_id` créé
- [ ] Données existantes mappées vers les modèles COMPL-AI
- [ ] API retourne les données du modèle
- [ ] Interface affiche les vrais logos
- [ ] Noms des modèles et providers corrects
- [ ] Messages conditionnels appropriés

### Test complet :
1. **Dashboard** : Vérifier l'affichage des cartes
2. **Page use case** : Vérifier l'affichage du modèle
3. **Création** : Tester la création d'un nouveau cas d'usage
4. **Édition** : Tester la modification du modèle

## 🎯 Bénéfices obtenus

- ✅ **Logos authentiques** : Utilisation des vrais logos des providers
- ✅ **Données cohérentes** : Modèles liés aux données COMPL-AI
- ✅ **Interface améliorée** : Affichage professionnel et informatif
- ✅ **Performance** : Requêtes optimisées avec index
- ✅ **Maintenabilité** : Structure de données normalisée

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifier les logs de la console du navigateur
2. Vérifier les logs du serveur Next.js
3. Tester l'API directement avec Postman/curl
4. Consulter la documentation Supabase

---

**Note** : Ces corrections sont rétrocompatibles et n'affectent pas les fonctionnalités existantes.
