# Intégration COMPL-AI dans le système de scoring

## 🎯 Objectif

Intégrer le score COMPL-AI des modèles dans le calcul des scores des cas d'usage selon la formule :

**Score final = (Score de base + Bonus) / Score maximum possible**

Où :
- **Score de base** : 90 points (score du questionnaire)
- **Bonus** : Score COMPL-AI × 20 (ex: 87,1% × 20 = 17,42 points)
- **Score maximum possible** : 120 points (90 + 30 de bonus max)

## 📊 Architecture de la solution

### 1. Relation structurée usecase ↔ compl_ai_models

#### Migration SQL
```sql
-- Ajouter la relation Foreign Key
ALTER TABLE usecases 
ADD COLUMN primary_model_id UUID REFERENCES compl_ai_models(id) ON DELETE SET NULL;

-- Index pour les performances
CREATE INDEX idx_usecases_primary_model_id ON usecases(primary_model_id);
```

**Fichier** : `supabase/migrations/20250724_add_usecase_model_relation.sql`

#### Vue simplifiée
```sql
CREATE VIEW usecases_with_model AS
SELECT u.*, m.model_name, m.model_provider, m.model_type, m.version as model_version
FROM usecases u
LEFT JOIN compl_ai_models m ON u.primary_model_id = m.id;
```

### 2. Types TypeScript mis à jour

#### Interface UseCase étendue
```typescript
export interface UseCase {
  // ... champs existants
  primary_model_id?: string        // NOUVEAU: relation vers compl_ai_models
  technology_partner?: string      // GARDE pour compatibilité
  llm_model_version?: string       // GARDE pour compatibilité
}

export interface UseCaseWithModel extends UseCase {
  model_name?: string
  model_provider?: string
  model_type?: string
  model_version?: string
  compl_ai_score?: number
}
```

#### Interface UseCaseScore étendue
```typescript
export interface UseCaseScore {
  // ... champs existants
  compl_ai_bonus?: number
  compl_ai_score?: number | null
  model_info?: {
    id: string
    name: string
    provider: string
  } | null
}
```

**Fichiers modifiés** :
- `lib/supabase.ts`
- `app/usecases/[id]/types/usecase.ts`

### 3. Module de scoring COMPL-AI

#### Fonctionnalités
- **`getComplAiScore(modelId)`** : Récupère le score COMPL-AI d'un modèle
- **`calculateComplAiBonus(score)`** : Calcule le bonus basé sur le score
- **`getUseCaseComplAiBonus(usecaseId)`** : Score complet pour un cas d'usage

#### Logique de calcul
```typescript
// Score COMPL-AI = moyenne des 5 principes EU AI Act
const complAiData = await getComplAiScore(modelId)
const bonus = complAiData.average_score * 20  // Ex: 0.871 × 20 = 17.42

// Application du bonus
finalScore = Math.min(baseScore + bonus, 120)
```

**Fichier** : `app/usecases/[id]/utils/compl-ai-scoring.ts`

### 4. Calculateur de score modifié

#### Changements principaux
- **Fonction asynchrone** : `calculateScore()` est maintenant `async`
- **Bonus intégré** : Ajout automatique du bonus COMPL-AI si modèle présent
- **Score maximum** : Porté de 90 à 120 points
- **Breakdown enrichi** : Explication du bonus dans le détail

#### Formule appliquée
```typescript
// Calcul du score de base (questionnaire)
let currentScore = BASE_SCORE // 90
// ... logique existante pour les réponses

// Ajout du bonus COMPL-AI
if (!isEliminated && modelId) {
  const bonus = await getUseCaseComplAiBonus(usecaseId)
  currentScore = Math.min(currentScore + bonus, MAX_POSSIBLE_SCORE) // 120
}
```

**Fichier modifié** : `app/usecases/[id]/utils/score-calculator.ts`

### 5. Interface utilisateur

#### Composant d'affichage du bonus
- **ComplAiScoreDisplay** : Affiche le bonus avec détails du modèle
- **Intégration** : Affiché dans `UseCaseScore.tsx`
- **Design** : Carte avec gradient bleu, score en pourcentage et barre de progression

#### Sélecteur de modèles
- **ModelSelector** : Composant de sélection des modèles COMPL-AI
- **Fonctionnalités** : Recherche, groupement par provider, clear
- **Usage** : Pour les formulaires de création/édition de cas d'usage

**Fichiers créés** :
- `app/usecases/[id]/components/ComplAiScoreDisplay.tsx`
- `app/usecases/[id]/components/ModelSelector.tsx`

## 🔄 Migration des données

### Script de mapping automatique
```sql
-- Mapping OpenAI GPT-4
UPDATE usecases 
SET primary_model_id = find_compl_ai_model('GPT-4', 'OpenAI')
WHERE LOWER(technology_partner) LIKE '%openai%' 
   OR LOWER(llm_model_version) LIKE '%gpt-4%';

-- Mapping Anthropic Claude
UPDATE usecases 
SET primary_model_id = find_compl_ai_model('Claude', 'Anthropic')
WHERE LOWER(technology_partner) LIKE '%anthropic%' 
   OR LOWER(llm_model_version) LIKE '%claude%';
```

**Fichier** : `scripts/migrate-usecase-models.sql`

### Fonction helper SQL
```sql
CREATE FUNCTION find_compl_ai_model(p_model_name TEXT, p_provider TEXT DEFAULT NULL) 
RETURNS UUID
-- Recherche intelligente par nom et provider avec fallback
```

## 🚀 Déploiement

### Étapes de migration

1. **Appliquer la migration SQL**
   ```bash
   # Via Supabase CLI
   supabase db push
   ```

2. **Mapper les données existantes**
   ```sql
   # Exécuter le script de mapping
   \i scripts/migrate-usecase-models.sql
   ```

3. **Vérifier les mappings**
   ```sql
   SELECT COUNT(*) as mapped_count FROM usecases WHERE primary_model_id IS NOT NULL;
   ```

### Points d'attention

- **Rétrocompatibilité** : Les champs `technology_partner` et `llm_model_version` sont conservés
- **Performance** : Index ajouté sur `primary_model_id` pour les jointures
- **Gestion d'erreurs** : Score par défaut si COMPL-AI indisponible
- **Migration progressive** : Possibilité de migrer par petits lots

## 📈 Bénéfices

1. **Intégrité référentielle** : Plus d'erreurs de saisie
2. **Score précis** : Bonus basé sur données réelles COMPL-AI
3. **Performance** : Jointures SQL optimisées
4. **Maintenance** : Modèles centralisés dans une table
5. **Évolutivité** : Facile d'ajouter de nouveaux modèles
6. **Transparence** : Explication détaillée du bonus dans l'interface

## 🔧 Utilisation

### Dans les formulaires
```typescript
<ModelSelector
  value={usecase.primary_model_id}
  onChange={(modelId, modelInfo) => {
    setUsecase(prev => ({ ...prev, primary_model_id: modelId }))
  }}
  placeholder="Choisir un modèle COMPL-AI..."
/>
```

### Dans l'affichage des scores
Le bonus COMPL-AI s'affiche automatiquement si présent :
- Carte dédiée avec informations du modèle
- Score COMPL-AI en pourcentage
- Bonus appliqué en points
- Explication de la formule

## 📝 Tests

Les tests doivent être mis à jour pour tenir compte de la nature asynchrone de `calculateScore()` :

```typescript
// Avant
const score = calculateScore(usecaseId, responses)

// Après  
const score = await calculateScore(usecaseId, responses)
```

**Fichier à mettre à jour** : `app/usecases/[id]/utils/__tests__/score-calculator.test.ts`