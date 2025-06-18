# Système de Completion de Questionnaire avec Stockage Supabase

## 🎯 Résumé des Fonctionnalités

Le système a été modifié pour :
1. **Sauvegarder automatiquement** chaque réponse dans Supabase avec des codes uniques
2. **Marquer le questionnaire comme "completed"** dans la base de données
3. **Calculer la progression** en temps réel
4. **Gérer les erreurs** et les états de chargement

## 🔧 Modifications Apportées

### 1. Hook `useQuestionnaire.ts` - Intégration Supabase

**Avant :**
```typescript
export function useQuestionnaire(onComplete: () => void)
```

**Après :**
```typescript
export function useQuestionnaire({ usecaseId, onComplete }: UseQuestionnaireProps)
```

**Nouvelles fonctionnalités :**
- ✅ Sauvegarde automatique de chaque réponse
- ✅ Chargement des réponses existantes au démarrage
- ✅ Mise à jour du statut du use case à "completed"
- ✅ Gestion d'erreurs avec messages utilisateur
- ✅ Conversion automatique des réponses en codes structurés

### 2. Composant `DraftQuestionnaire.tsx` - Interface Améliorée

**Ajouts :**
- ✅ Affichage des erreurs avec icône
- ✅ Passage de l'`usecaseId` au hook
- ✅ Messages de chargement contextuels ("Sauvegarde..." vs "Envoi...")
- ✅ Message de confirmation amélioré

### 3. API Endpoints

#### `/api/usecases/[id]/responses`
- **GET** : Récupérer toutes les réponses
- **POST** : Sauvegarder une réponse individuelle
- **PUT** : Sauvegarder plusieurs réponses

#### `/api/usecases/[id]/progress`
- **GET** : Obtenir la progression du questionnaire

### 4. Base de Données

**Table `usecase_responses` créée avec :**
```sql
- id: UUID unique
- usecase_id: Référence au use case
- question_code: Code de la question (E6.N10.Q1)
- response_value: Code de la réponse (E6.N10.Q1.A)
- response_data: Données complexes (JSON)
- answered_by: Email de l'utilisateur
- answered_at: Timestamp de réponse
```

**Sécurité :**
- ✅ RLS (Row Level Security) activée
- ✅ Contraintes d'unicité (une réponse par question par use case)
- ✅ Index pour les performances

## 🚀 Flux de Fonctionnement

### 1. Démarrage du Questionnaire
```typescript
// Le hook charge automatiquement les réponses existantes
useEffect(() => {
  if (Object.keys(formattedAnswers).length > 0) {
    setQuestionnaireData(prev => ({
      ...prev,
      answers: formattedAnswers
    }))
  }
}, [formattedAnswers])
```

### 2. Réponse à une Question
```typescript
const handleAnswerSelect = async (answer: any) => {
  // 1. Mise à jour immédiate de l'UI
  setQuestionnaireData(prev => ({
    ...prev,
    answers: { ...prev.answers, [currentQuestion.id]: answer }
  }))

  // 2. Sauvegarde automatique en arrière-plan
  await saveIndividualResponse(currentQuestion.id, answer)
}
```

### 3. Conversion des Réponses en Codes
```typescript
if (question.type === 'radio') {
  // Trouve le code de l'option sélectionnée
  const selectedOption = question.options.find(opt => opt.label === answer)
  await saveResponse(questionId, selectedOption.code) // Ex: "E6.N10.Q1.A"
}
```

### 4. Completion du Questionnaire
```typescript
const handleSubmit = async () => {
  // 1. Sauvegarde finale de toutes les réponses
  await saveMultiple(questionnaireData.answers)
  
  // 2. Mise à jour du statut dans la table usecases
  await updateUsecaseStatus('completed')
  
  // 3. Callback de completion
  onComplete()
}
```

## 📊 Structure des Données Sauvegardées

### Question Radio
```json
{
  "question_code": "E6.N10.Q1",
  "response_value": "E6.N10.Q1.A",
  "answered_by": "user@example.com"
}
```

### Question Checkbox/Tags
```json
{
  "question_code": "E4.N7.Q2",
  "response_data": {
    "selected_codes": ["E4.N7.Q2.A", "E4.N7.Q2.C"],
    "selected_labels": ["Option A", "Option C"]
  },
  "answered_by": "user@example.com"
}
```

### Question Conditionnelle
```json
{
  "question_code": "E5.N9.Q6",
  "response_data": {
    "selected": "Si oui préciser",
    "conditionalValues": {
      "Précisions": "Nous effectuons des tests réguliers..."
    }
  },
  "answered_by": "user@example.com"
}
```

## 🔍 Suivi de Progression

L'API `/api/usecases/[id]/progress` retourne :
```json
{
  "usecase_id": "uuid",
  "completion_percentage": 85,
  "is_completed": false,
  "answered_questions": 16,
  "total_questions": 19,
  "status": "in_progress",
  "answered_question_codes": ["E4.N7.Q1", "E4.N7.Q2", ...]
}
```

## ⚡ Avantages du Nouveau Système

1. **Pas de perte de données** : Sauvegarde automatique à chaque réponse
2. **Reprise de session** : L'utilisateur peut reprendre où il s'est arrêté
3. **Codes structurés** : Facilite l'analyse et le reporting
4. **Performance optimisée** : Mise à jour locale + sauvegarde en arrière-plan
5. **Gestion d'erreurs robuste** : Messages clairs et récupération automatique
6. **Sécurité** : RLS et validation d'accès
7. **Auditabilité** : Traçabilité complète avec timestamps et utilisateurs

## 🧪 Test du Système

Pour tester le système :

1. **Démarrer un questionnaire** sur un use case
2. **Répondre à quelques questions** → Vérifier la sauvegarde automatique
3. **Rafraîchir la page** → Vérifier que les réponses sont rechargées
4. **Terminer le questionnaire** → Vérifier que le statut passe à "completed"
5. **Vérifier en base** → Les codes de réponses sont correctement stockés

## 🔧 Maintenance

- **Migration de données** : Script disponible pour migrer les anciennes réponses
- **Monitoring** : Logs détaillés pour le debugging
- **Performance** : Index optimisés pour les requêtes fréquentes
- **Évolutivité** : Structure extensible pour de nouveaux types de questions 