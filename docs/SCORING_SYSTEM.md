# Système de Calcul de Score MaydAI

## Vue d'ensemble

Le système de scoring de MaydAI évalue la conformité des cas d'usage IA selon le règlement européen AI Act. Il combine une évaluation basée sur les réponses au questionnaire et un bonus potentiel lié au modèle COMPL-AI utilisé.

## Architecture

### 1. Composants principaux

- **API Route** : `/api/usecases/[id]/calculate-score` - Endpoint Next.js pour le calcul
- **Score Calculator** : `lib/score-calculator-simple.ts` - Logique métier du calcul
- **Score Service** : `lib/score-service.ts` - Service client pour appeler l'API
- **Questions Data** : `lib/questions-data.ts` - Configuration des questions et impacts

### 2. Flow de données

```
Utilisateur → UI → Score Service → API Route → Score Calculator → Base de données
                                                        ↓
                                              Questions Data (config)
```

## Algorithme de calcul

### Formule principale

```
Score Final = ((Score_Base + Score_Model) / 120) × 100
```

Où :
- **Score_Base** : Score basé sur les réponses (max 90 points)
- **Score_Model** : Bonus COMPL-AI (max 20 points)
- **Total** : Sur 120 points, converti en pourcentage

### Calcul du Score de Base

1. **Point de départ** : 90 points
2. **Impacts négatifs** : Chaque réponse peut réduire le score
3. **Score minimum** : 0 (ne peut pas être négatif)
4. **Cas éliminatoires** : Certaines réponses mettent le score à 0

### Calcul du Score Modèle (COMPL-AI)

1. **Récupération** : Score moyen des évaluations COMPL-AI du modèle
2. **Conversion** : Score sur échelle 0-1 converti en 0-20 points
3. **Application** : Ajouté au score de base avec pondération

### Cas éliminatoires

Les pratiques suivantes entraînent un score de 0 :
- Identification biométrique à distance
- Composant de sécurité critique
- Évaluations dans l'éducation/entreprise  
- Accès aux services essentiels
- Exploitation de vulnérabilités
- Manipulation et tromperie
- Notation sociale
- Profilage criminel

## Catégories de risque

Le système évalue 7 catégories principales :

1. **Niveau de Risque** (`risk_level`) - Impact le plus élevé
2. **Transparence** (`transparency`) - Information des utilisateurs
3. **Robustesse Technique** (`technical_robustness`) - Sécurité et fiabilité
4. **Supervision Humaine** (`human_oversight`) - Contrôle humain
5. **Confidentialité & Données** (`privacy_data`) - Protection des données
6. **Impact Social** (`social_environmental`) - Bien-être et environnement
7. **Équité** (`diversity_fairness`) - Non-discrimination

## Utilisation

### Calcul initial

```typescript
// Côté client
const service = new ScoreService(accessToken);
const result = await service.calculateUseCaseScore(usecaseId);
```

### Structure de la réponse

```typescript
interface ScoreCalculationResponse {
  success: boolean
  usecase_id: string
  scores: {
    score_base: number        // Score de base (0-90)
    score_model: number|null  // Bonus modèle (0-20)
    score_final: number       // Score final en %
    is_eliminated: boolean    // Cas éliminatoire
    elimination_reason: string // Raison si éliminé
  }
  calculation_details: {
    base_score: number
    total_impact: number
    final_base_score: number
    model_score: number|null
    model_percentage: number|null
    has_model_score: boolean
    formula_used: string
    weights: {
      base_score_weight: number
      model_score_weight: number
      total_weight: number
    }
  }
}
```

## Tests

Les tests unitaires couvrent :
- Calcul du score de base
- Application des impacts
- Cas éliminatoires
- Intégration du bonus COMPL-AI
- Calcul du score final

Exécution : `npm test lib/score-calculator-simple.test.ts`

## Base de données

Les scores sont stockés dans la table `usecases` :
- `score_base` : Score de base calculé
- `score_model` : Bonus modèle COMPL-AI
- `score_final` : Score final en pourcentage
- `is_eliminated` : Indicateur d'élimination
- `elimination_reason` : Raison de l'élimination
- `last_calculation_date` : Date du dernier calcul

## Maintenance

### Ajout de questions

1. Éditer `lib/questions-data.ts`
2. Ajouter la question avec ses options et impacts
3. Les impacts négatifs réduisent le score
4. `is_eliminatory: true` pour les cas éliminatoires

### Modification des poids

Dans `lib/score-calculator-simple.ts` :
- `BASE_SCORE` : Score de départ (90)
- `BASE_SCORE_WEIGHT` : Poids du score base (100)
- `MODEL_SCORE_WEIGHT` : Poids du bonus modèle (20)
- `TOTAL_WEIGHT` : Total des poids (120)

## Sécurité

- Authentification requise via JWT
- Vérification des autorisations (company_id)
- Validation des données d'entrée
- Gestion des erreurs avec messages appropriés

## Performance

- Calcul synchrone rapide (~100ms)
- Mise en cache côté client possible
- Recalcul à la demande uniquement

## Évolutions futures

- [ ] Historique des scores
- [ ] Comparaison entre versions
- [ ] Export des détails de calcul
- [ ] Notifications de changements
- [ ] API batch pour plusieurs cas