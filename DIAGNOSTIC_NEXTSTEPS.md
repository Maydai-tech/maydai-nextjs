# 🔍 Diagnostic - Cas d'usage `5f6c216e-6ed5-47d1-a61e-266c5b4fe91e`

**Date du diagnostic** : 2025-01-21  
**Problème** : Aucune information dans `usecase_nextsteps` (tous les champs sont NULL)

## 📊 Résumé Exécutif

Le cas d'usage a un rapport généré (3305 caractères) mais les `nextSteps` sont vides. Le problème vient d'un **décalage de format** : OpenAI génère du JSON au lieu du Markdown attendu, et les clés JSON ne correspondent pas à celles attendues par le parser.

## 🔍 Détails du Diagnostic

### 1. État du Cas d'Usage

- **ID** : `5f6c216e-6ed5-47d1-a61e-266c5b4fe91e`
- **Nom** : "Assistant Marketing contenus"
- **Statut** : `completed`
- **Rapport généré le** : 2025-11-26T11:25:24.28+00:00
- **Taille du rapport** : 3305 caractères
- **Questionnaire** : 17 réponses enregistrées ✅

### 2. État des NextSteps

- **Enregistrement présent** : ✅ Oui
- **Champs remplis** : 7/20 (métadonnées uniquement)
- **Champs vides** : 13/20 (tous les champs de contenu)

**Champs remplis** :
- `id`, `usecase_id`, `generated_at`, `model_version`, `processing_time_ms`, `created_at`, `updated_at`

**Champs vides** :
- `introduction`, `evaluation`, `impact`, `conclusion`
- `priorite_1`, `priorite_2`, `priorite_3`
- `quick_win_1`, `quick_win_2`, `quick_win_3`
- `action_1`, `action_2`, `action_3`

### 3. Format du Rapport Généré

Le rapport est au **format JSON** avec la structure suivante :

```json
{
  "introduction_contextuelle": "## Introduction contextuelle\n...",
  "evaluation_risque": {
    "niveau": "Risque limité",
    "justification": "..."
  },
  "priorites_actions_reglementaires": [
    "Action 1",
    "Action 2",
    "Action 3"
  ],
  "quick_wins_actions_immediates": [...],
  "impact_attendu": "## Impact attendu\n...",
  "actions_moyen_terme": [...],
  "conclusion": "## Conclusion\n..."
}
```

### 4. Pourquoi l'Extraction Échoue

Le parser `extractNextStepsFromReport` détecte le format ainsi :

1. **Vérification Markdown** : Cherche `## Introduction contextuelle` ou `### Les 3 priorités`
   - ❌ Échoue : Le JSON contient ces chaînes mais dans des valeurs, pas comme structure Markdown

2. **Vérification JSON** : Cherche `"introduction"` ou `"priorite_1"`
   - ❌ Échoue : Le JSON utilise `"introduction_contextuelle"` et `"priorites_actions_reglementaires"` (tableau)

3. **Fallback Markdown** : Essaie l'extraction Markdown par défaut
   - ❌ Échoue : Le contenu est du JSON, pas du Markdown

**Résultat** : Aucune donnée extraite → Objet vide → Sauvegarde d'une ligne avec tous les champs NULL

### 5. Analyse des Sections

**Sections attendues** (format Markdown) :
- `## Introduction contextuelle`
- `## Évaluation du niveau de risque AI Act`
- `### Les 3 priorités d'actions réglementaires`
- `### Quick wins & actions immédiates recommandées`
- `### Actions à moyen terme`
- `## Impact attendu`
- `## Conclusion`

**Résultat** : 0/7 sections trouvées dans le rapport (car c'est du JSON, pas du Markdown)

### 6. Cause Racine

Le prompt OpenAI demande explicitement du **Markdown** :

```typescript
**INSTRUCTIONS DE FORMATAGE OBLIGATOIRES :**

Tu dois suivre EXACTEMENT cette structure Markdown, sans modification :

1. **Titre principal** : "# Recommandations et plan d'action"
2. **Introduction contextuelle** : "## Introduction contextuelle"
...
```

Mais l'**Assistant OpenAI** (configuré via `OPENAI_ASSISTANT_ID`) génère du **JSON** à la place.

**Hypothèses** :
1. L'assistant OpenAI est configuré avec `response_format: { type: "json_object" }`
2. L'assistant a été entraîné/configuré pour générer du JSON
3. Un changement dans le comportement d'OpenAI

## 🎯 Solutions Possibles

### Solution 1 : Adapter le Parser pour le Format JSON Actuel

Modifier `extractNextStepsFromJSON` pour gérer les clés actuelles :

```typescript
// Dans lib/nextsteps-parser.ts
export function extractNextStepsFromJSON(reportText: string): Partial<UseCaseNextStepsInput> {
  try {
    const jsonData = JSON.parse(reportText)
    const result: Partial<UseCaseNextStepsInput> = {}
    
    // Mapper les nouvelles clés vers les anciennes
    if (jsonData.introduction_contextuelle) {
      result.introduction = jsonData.introduction_contextuelle.replace(/^## Introduction contextuelle\s*\n/, '').trim()
    }
    
    if (jsonData.evaluation_risque) {
      result.evaluation = typeof jsonData.evaluation_risque === 'string' 
        ? jsonData.evaluation_risque
        : `${jsonData.evaluation_risque.niveau}: ${jsonData.evaluation_risque.justification}`
    }
    
    // Priorités (tableau → champs individuels)
    if (Array.isArray(jsonData.priorites_actions_reglementaires)) {
      result.priorite_1 = jsonData.priorites_actions_reglementaires[0]
      result.priorite_2 = jsonData.priorites_actions_reglementaires[1]
      result.priorite_3 = jsonData.priorites_actions_reglementaires[2]
    }
    
    // Quick wins (tableau → champs individuels)
    if (Array.isArray(jsonData.quick_wins_actions_immediates)) {
      result.quick_win_1 = jsonData.quick_wins_actions_immediates[0]
      result.quick_win_2 = jsonData.quick_wins_actions_immediates[1]
      result.quick_win_3 = jsonData.quick_wins_actions_immediates[2]
    }
    
    // Actions à moyen terme (tableau → champs individuels)
    if (Array.isArray(jsonData.actions_moyen_terme)) {
      result.action_1 = jsonData.actions_moyen_terme[0]
      result.action_2 = jsonData.actions_moyen_terme[1]
      result.action_3 = jsonData.actions_moyen_terme[2]
    }
    
    if (jsonData.impact_attendu) {
      result.impact = jsonData.impact_attendu.replace(/^## Impact attendu\s*\n/, '').trim()
    }
    
    if (jsonData.conclusion) {
      result.conclusion = jsonData.conclusion.replace(/^## Conclusion\s*\n/, '').trim()
    }
    
    return result
  } catch (error) {
    console.error('❌ Erreur parsing JSON:', error)
    return {}
  }
}
```

Et améliorer la détection :

```typescript
export function extractNextStepsFromReport(reportText: string): Partial<UseCaseNextStepsInput> {
  // Détecter le format JSON (vérifier si c'est un JSON valide)
  if (reportText.trim().startsWith('{')) {
    try {
      JSON.parse(reportText)
      return extractNextStepsFromJSON(reportText)
    } catch {
      // Pas un JSON valide, continuer avec Markdown
    }
  }
  
  // Format Markdown structuré
  if (reportText.includes('## Introduction contextuelle') || reportText.includes('### Les 3 priorités')) {
    return extractNextStepsFromMarkdown(reportText)
  }
  
  // Format JSON avec anciennes clés
  if (reportText.includes('"introduction"') || reportText.includes('"priorite_1"')) {
    return extractNextStepsFromJSON(reportText)
  }
  
  // Fallback
  console.warn('⚠️ Format de rapport non reconnu, tentative d\'extraction Markdown')
  return extractNextStepsFromMarkdown(reportText)
}
```

### Solution 2 : Forcer le Format Markdown dans l'Assistant OpenAI

Vérifier la configuration de l'assistant OpenAI et s'assurer qu'il génère du Markdown, pas du JSON.

### Solution 3 : Régénérer le Rapport

Régénérer le rapport pour ce cas d'usage après avoir corrigé le problème de format.

## 📝 Actions Recommandées

1. **Court terme** : Implémenter la Solution 1 pour gérer le format JSON actuel
2. **Moyen terme** : Vérifier la configuration de l'assistant OpenAI
3. **Long terme** : Standardiser le format de sortie (Markdown ou JSON, mais pas les deux)

## 🔧 Scripts de Diagnostic Créés

- `scripts/diagnose-usecase-nextsteps.ts` : Diagnostic complet d'un cas d'usage
- `scripts/inspect-report-content.ts` : Inspection du contenu du rapport

**Usage** :
```bash
npx tsx scripts/diagnose-usecase-nextsteps.ts <usecase_id>
npx tsx scripts/inspect-report-content.ts <usecase_id>
```

