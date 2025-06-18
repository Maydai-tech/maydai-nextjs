# Système de Stockage des Réponses de Questionnaire

Ce système permet de sauvegarder automatiquement les réponses aux questionnaires dans Supabase avec des codes uniques pour chaque option de réponse.

## 🏗️ Architecture

### Structure des Codes de Réponse
Chaque réponse possède maintenant un code unique au format : `{ID_QUESTION}.{LETTRE}`

**Exemples :**
- `E6.N10.Q1.A` → "Oui" pour la question E6.N10.Q1
- `E6.N10.Q1.B` → "Non" pour la question E6.N10.Q1
- `E4.N7.Q2.A` → "Identification Biométrique à Distance..."

### Base de Données
La table `usecase_responses` stocke :
```sql
- id: UUID unique
- usecase_id: Référence au use case
- question_code: Code de la question (E6.N10.Q1)
- response_value: Valeur simple (pour radio/text)
- response_data: Données complexes (JSON pour checkbox/conditional)
- answered_by: Email de l'utilisateur
- answered_at: Timestamp de réponse
```

## 🚀 Utilisation

### 1. Hook useQuestionnaireResponses
```typescript
import { useQuestionnaireResponses } from '@/lib/hooks/useQuestionnaireResponses'

function MyQuestionnaire({ usecaseId }) {
  const {
    formattedAnswers,    // Réponses formatées pour l'UI
    loading,             // État de chargement
    saving,              // État de sauvegarde
    error,               // Erreurs éventuelles
    saveResponse,        // Sauvegarder une réponse
    saveMultiple,        // Sauvegarder plusieurs réponses
    hasResponse          // Vérifier si une question a une réponse
  } = useQuestionnaireResponses(usecaseId)
}
```

### 2. Sauvegarder une Réponse Simple
```typescript
// Pour une question radio
await saveResponse('E6.N10.Q1', 'E6.N10.Q1.A') // Sauvegarde "Oui"

// Pour une question avec données complexes
await saveResponse('E5.N9.Q6', undefined, {
  selected: 'Oui',
  conditionalValues: { 'Précisions': 'Nous utilisons...' }
})
```

### 3. Sauvegarder Plusieurs Réponses
```typescript
const answers = {
  'E6.N10.Q1': 'Oui',
  'E6.N10.Q2': 'Non',
  'E4.N7.Q2': ['Option1', 'Option2']
}

await saveMultiple(answers)
```

### 4. API Endpoints
```
GET    /api/usecases/[id]/responses    # Récupérer les réponses
POST   /api/usecases/[id]/responses    # Sauvegarder une réponse
PUT    /api/usecases/[id]/responses    # Sauvegarder plusieurs réponses
```

## 📝 Types de Questions Supportés

### Radio Buttons
```typescript
// Structure de la réponse
{
  question_code: 'E6.N10.Q1',
  response_value: 'E6.N10.Q1.A'  // Code de l'option sélectionnée
}
```

### Checkboxes/Tags
```typescript
// Structure de la réponse
{
  question_code: 'E4.N7.Q2',
  response_data: {
    selected_codes: ['E4.N7.Q2.A', 'E4.N7.Q2.C'],
    selected_labels: ['Option A', 'Option C']
  }
}
```

### Questions Conditionnelles
```typescript
// Structure de la réponse
{
  question_code: 'E5.N9.Q6',
  response_data: {
    selected: 'Si oui préciser',
    conditionalValues: {
      'Précisions': 'Nous effectuons des tests...'
    }
  }
}
```

## 🔒 Sécurité

- **RLS (Row Level Security)** : Les utilisateurs ne peuvent accéder qu'aux réponses de leur entreprise
- **Validation d'accès** : Vérification que l'utilisateur appartient à la même entreprise que le use case
- **Authentification** : Toutes les requêtes nécessitent un token valide

## 🎯 Exemple Complet d'Intégration

```typescript
import React from 'react'
import { useQuestionnaireResponses } from '@/lib/hooks/useQuestionnaireResponses'
import { QUESTIONS } from '@/app/usecases/[id]/data/questions'

export default function MyQuestionnaire({ usecaseId }) {
  const {
    formattedAnswers,
    loading,
    saving,
    saveResponse,
    hasResponse
  } = useQuestionnaireResponses(usecaseId)

  const handleRadioChange = async (questionId, selectedLabel) => {
    const question = QUESTIONS[questionId]
    const selectedOption = question.options.find(opt => opt.label === selectedLabel)
    
    if (selectedOption) {
      await saveResponse(questionId, selectedOption.code)
    }
  }

  const handleCheckboxChange = async (questionId, selectedLabels) => {
    const question = QUESTIONS[questionId]
    const selectedCodes = selectedLabels.map(label => {
      const option = question.options.find(opt => opt.label === label)
      return option?.code
    }).filter(Boolean)
    
    await saveResponse(questionId, undefined, {
      selected_codes: selectedCodes,
      selected_labels: selectedLabels
    })
  }

  if (loading) return <div>Chargement...</div>

  return (
    <div>
      {Object.entries(QUESTIONS).map(([questionId, question]) => (
        <QuestionCard
          key={questionId}
          question={question}
          answer={formattedAnswers[questionId]}
          onAnswerChange={(answer) => {
            if (question.type === 'radio') {
              handleRadioChange(questionId, answer)
            } else if (question.type === 'checkbox') {
              handleCheckboxChange(questionId, answer)
            }
          }}
          hasResponse={hasResponse(questionId)}
          saving={saving}
        />
      ))}
    </div>
  )
}
```

## 🧪 Migration de Données Existantes

Si vous avez des réponses existantes sans codes, vous pouvez les migrer :

```sql
-- Script de migration (à adapter selon vos besoins)
UPDATE usecase_responses 
SET response_value = 'E6.N10.Q1.A' 
WHERE question_code = 'E6.N10.Q1' AND response_value = 'Oui';
```

## 🐛 Gestion d'Erreurs

Le système gère automatiquement :
- **Erreurs de réseau** : Retry automatique avec messages d'erreur
- **Conflits de sauvegarde** : Upsert automatique (création ou mise à jour)
- **Validation des données** : Vérification des codes de questions
- **Sessions expirées** : Redirection vers la connexion

## 📊 Avantages

1. **Codes structurés** : Facilite l'analyse et le reporting
2. **Sauvegarde automatique** : Pas de perte de données utilisateur
3. **Performance optimisée** : Sauvegarde en temps réel avec état local
4. **Sécurité renforcée** : RLS et validation d'accès
5. **Flexibilité** : Support de tous les types de questions
6. **Auditabilité** : Traçabilité complète des réponses 