# Système de Scores MaydAI (Logique TypeScript)

## 🎯 Vue d'ensemble

Le système de scores MaydAI normalise les évaluations COMPL-AI pour créer un score équitable et cohérent basé sur les 5 principes de l'EU AI Act. **Toute la logique métier est implémentée en TypeScript dans Next.js**, Supabase servant uniquement de base de données.

## 📊 Logique de Calcul

### Principe de Base
- **5 principes EU AI Act** : Chaque principe vaut **4 points maximum**
- **Score total maximum** : 20 points (5 × 4)
- **Gestion des N/A** : Les benchmarks sans score (N/A) sont ignorés dans le calcul

### Formule de Calcul
```
Score MaydAI par évaluation = Score original × (4 / Nombre de benchmarks valides du principe)
Score MaydAI par principe = Somme des scores MaydAI de toutes les évaluations valides
Score MaydAI total = Somme des 5 scores par principe (max 20)
```

### Exemple Concret
**Principe "Technical Robustness & Safety"** avec 6 benchmarks :
- Benchmarks : [0.8, N/A, 0.6, N/A, 0.9, 0.7]
- Benchmarks valides : [0.8, 0.6, 0.9, 0.7] = 4 benchmarks
- Facteur de normalisation : 4/4 = 1.0
- Scores MaydAI individuels :
  - 0.8 × 1.0 = **0.8 point**
  - 0.6 × 1.0 = **0.6 point**  
  - 0.9 × 1.0 = **0.9 point**
  - 0.7 × 1.0 = **0.7 point**
- Score MaydAI total du principe : 0.8 + 0.6 + 0.9 + 0.7 = **3.0/4 points**

### Exemple avec 3 Évaluations (cas de l'interface)
**Principe avec 3 benchmarks valides :**
- Benchmarks : [0.973, 0.998, 1.000]
- Facteur de normalisation : 4/3 = 1.333
- Scores MaydAI individuels :
  - 0.973 × 1.333 = **1.30 point**
  - 0.998 × 1.333 = **1.33 point**
  - 1.000 × 1.333 = **1.33 point**
- Score MaydAI total du principe : 1.30 + 1.33 + 1.33 = **3.96/4 points**

## 🏗️ Architecture Technique

### Base de Données (Simple)
```sql
-- Seule colonne ajoutée dans compl_ai_evaluations
ALTER TABLE compl_ai_evaluations ADD COLUMN maydai_score DECIMAL(4,3);
```

### Logique TypeScript (lib/maydai-calculator.ts)
```typescript
// Fonction de calcul par principe
calculatePrincipleMaydaiScore(scores: (number | null)[]): number

// Calcul complet pour un modèle
calculateModelMaydaiScores(modelId: string): Promise<ModelScoreResult>

// Recalcul global
recalculateAllMaydaiScores(): Promise<ModelScoreResult[]>

// Sauvegarde en base
saveMaydaiScores(modelId: string, results: ModelScoreResult): Promise<number>
```

### Pas de Triggers/Vues Complexes
- ✅ **Logique 100% TypeScript** : Plus facile à déboguer et tester
- ✅ **Base de données simple** : Juste stockage, pas de logique métier
- ✅ **Contrôle total** : Modification facile de la logique de calcul

## 🔄 Synchronisation

### Automatique
Les synchronisations COMPL-AI (JSON et API Gradio) recalculent automatiquement tous les scores MaydAI à la fin du processus.

### Manuel
```bash
# Recalculer tous les scores
POST /api/admin/compl-ai/recalculate-maydai-scores

# Recalculer pour un modèle spécifique
POST /api/admin/compl-ai/recalculate-maydai-scores
{ "model_id": "uuid-du-modele" }

# Obtenir les statistiques
GET /api/admin/compl-ai/recalculate-maydai-scores
```

## 🧮 Utilisation dans l'Application

### Interface TypeScript
```typescript
import { getComplAiScore, calculateMaydAiBonus } from '@/app/usecases/[id]/utils/compl-ai-scoring'

const modelScore = await getComplAiScore(modelId)
console.log({
  total_maydai_score: modelScore.total_maydai_score, // max 20
  avg_per_principle: modelScore.avg_maydai_score_per_principle, // max 4
  principle_scores: modelScore.maydai_principle_scores, // { principle: score }
  valid_benchmarks_percentage: modelScore.valid_benchmarks_percentage
})

// Bonus pour le scoring des use cases
const bonus = calculateMaydAiBonus(modelScore.total_maydai_score) // retourne directement les 0-20 points
```

### Bonus dans les Use Cases
```typescript
const useCaseBonus = await getUseCaseComplAiBonus(usecaseId)
console.log({
  maydaiBonus: useCaseBonus.maydaiBonus, // 0-20 points
  maydaiScore: useCaseBonus.maydaiScore, // score brut 0-20
  complAiScore: useCaseBonus.complAiScore, // score original 0-1
  bonus: useCaseBonus.bonus // bonus COMPL-AI original
})
```

## 📈 Avantages du Système MaydAI

### ✅ Équité
- Chaque principe a le même poids (4 points)
- Les modèles ne sont pas pénalisés pour les benchmarks N/A
- Normalisation cohérente entre tous les modèles

### ✅ Transparence  
- Calcul documenté et reproductible
- Vues SQL pour audit et vérification
- Logs de tous les recalculs

### ✅ Performance
- Calculs PostgreSQL optimisés
- Triggers automatiques pour cohérence
- Vues précalculées pour accès rapide

### ✅ Maintenabilité
- Fonction unique de calcul
- Recalcul automatique lors des mises à jour
- API admin pour gestion manuelle

## 🔍 Monitoring & Debug

### Vérifications de Cohérence
```sql
-- Vérifier l'absence d'incohérences (même modèle/principe = même score MaydAI)
SELECT model_id, principle_id, COUNT(DISTINCT maydai_score) as distinct_scores
FROM compl_ai_evaluations 
WHERE maydai_score IS NOT NULL
GROUP BY model_id, principle_id
HAVING COUNT(DISTINCT maydai_score) > 1;
```

### Statistiques Globales
```sql
SELECT * FROM compl_ai_maydai_stats;
```

### Logs des Recalculs
```sql
SELECT * FROM compl_ai_sync_logs 
WHERE raw_data->>'operation' LIKE '%maydai%' 
ORDER BY created_at DESC;
```

## 🚀 Migration Initiale

La migration `20250801_populate_initial_maydai_scores.sql` calcule automatiquement tous les scores MaydAI pour les données existantes lors du déploiement.

## 📋 Points Clés

1. **Score maximum** : 4 points par principe, 20 points total
2. **Gestion N/A** : Benchmarks ignorés, pas de pénalité
3. **Calcul automatique** : Triggers PostgreSQL pour cohérence
4. **Audit complet** : Vues et logs pour traçabilité
5. **API admin** : Recalcul manuel si nécessaire