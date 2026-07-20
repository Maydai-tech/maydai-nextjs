# 📘 Guide historique : configuration de l'Assistant OpenAI

> Ce document décrit l'ancien workflow Assistants API et est conservé pour historique. L'application utilise désormais Responses API. Seule la clé secrète `OPENAI_API_KEY` est configurée dans l'environnement ; le modèle, le vector store et les instructions système sont versionnés dans le repo.

## 🎯 Objectif

Configurer l'assistant OpenAI pour qu'il génère systématiquement du **Markdown** au lieu du JSON, conformément aux instructions du prompt.

## 🔍 Problème Actuel

L'assistant OpenAI génère actuellement du **JSON** alors que le prompt demande explicitement du **Markdown**. Cela cause des problèmes d'extraction car le parser attend du Markdown structuré.

## 📋 Étapes de Configuration

### Étape 1 : Accéder à l'Interface OpenAI

1. Connectez-vous à [platform.openai.com](https://platform.openai.com)
2. Naviguez vers **Assistants** dans le menu de gauche
3. Trouvez l'assistant utilisé (ID stocké dans `OPENAI_ASSISTANT_ID`)

### Étape 2 : Vérifier la Configuration Actuelle

Dans les paramètres de l'assistant, vérifiez :

1. **Response Format** :
   - ❌ Si défini sur `JSON Object` → C'est la cause du problème
   - ✅ Doit être sur `Text` ou non défini (par défaut)

2. **Instructions** :
   - Vérifiez que les instructions ne demandent pas explicitement du JSON
   - Les instructions doivent demander du Markdown

### Étape 3 : Modifier la Configuration

#### Option A : Via l'Interface Web (Recommandé)

1. Ouvrez l'assistant dans l'interface OpenAI
2. Dans la section **Settings** ou **Configuration** :
   - **Response Format** : Laissez vide ou sélectionnez `Text`
   - **Instructions** : Ajoutez ou modifiez pour inclure :

```
IMPORTANT : Tu dois TOUJOURS répondre en format Markdown, jamais en JSON.
Suis exactement la structure Markdown demandée dans le prompt utilisateur.
```

3. Sauvegardez les modifications

#### Option B : Via l'API OpenAI (Programmatique)

Si vous préférez modifier via l'API, utilisez ce code :

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function updateAssistant() {
  const assistantId = process.env.OPENAI_ASSISTANT_ID
  
  const assistant = await openai.beta.assistants.update(assistantId, {
    instructions: `
IMPORTANT : Tu dois TOUJOURS répondre en format Markdown, jamais en JSON.
Suis exactement la structure Markdown demandée dans le prompt utilisateur.

Les instructions de formatage dans le prompt utilisateur sont OBLIGATOIRES.
Respecte EXACTEMENT la structure Markdown demandée.
    `,
    // Ne PAS définir response_format pour forcer le Markdown
    // response_format: undefined ou ne pas inclure cette propriété
  })
  
  console.log('Assistant mis à jour:', assistant.id)
}
```

### Étape 4 : Vérifier les Instructions Système

Dans les **Instructions** de l'assistant, assurez-vous qu'il n'y a pas de demande de format JSON. Les instructions doivent être :

```
Tu es un expert en conformité AI Act. Tu génères des rapports d'analyse de conformité.

FORMAT DE RÉPONSE :
- Toujours utiliser le format Markdown
- Suivre exactement la structure demandée dans le prompt utilisateur
- Ne jamais utiliser de format JSON
- Respecter les titres et sous-titres Markdown demandés
```

### Étape 5 : Tester la Configuration

1. Créez un nouveau cas d'usage de test
2. Générez un rapport via `/api/generate-report`
3. Vérifiez le format du rapport dans `usecases.report_summary`
4. Le rapport doit commencer par `# Recommandations et plan d'action` (Markdown)
5. Le rapport ne doit PAS commencer par `{` (JSON)

## 🔧 Configuration Alternative : Utiliser un Modèle Direct

Si la configuration de l'assistant ne fonctionne pas, vous pouvez modifier le code pour utiliser directement un modèle au lieu d'un assistant :

### Option : Modifier `lib/openai-client.ts`

```typescript
// Au lieu d'utiliser l'assistant
async generateComplianceAnalysisComplete(data: OpenAIAnalysisInputComplete): Promise<string> {
  const prompt = this.buildCompleteAnalysisPrompt(data)
  
  // Utiliser directement le modèle avec response_format non défini
  const completion = await this.client.chat.completions.create({
    model: 'gpt-4-turbo-preview', // ou votre modèle préféré
    messages: [
      {
        role: 'system',
        content: 'Tu es un expert en conformité AI Act. Tu génères des rapports en format Markdown uniquement.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    // Ne PAS définir response_format pour forcer le Markdown
  })
  
  return completion.choices[0].message.content || ''
}
```

## 📝 Checklist de Vérification

- [ ] L'assistant OpenAI n'a pas `response_format: { type: "json_object" }`
- [ ] Les instructions de l'assistant demandent explicitement du Markdown
- [ ] Les instructions ne mentionnent pas le format JSON
- [ ] Un test de génération produit du Markdown, pas du JSON
- [ ] Le parser extrait correctement les données du rapport Markdown

## 🚨 Dépannage

### Le rapport est toujours en JSON

1. Vérifiez que `response_format` n'est pas défini dans l'assistant
2. Vérifiez les instructions système de l'assistant
3. Testez avec un prompt simple pour voir le format de réponse
4. Considérez utiliser un modèle direct au lieu d'un assistant

### Le rapport est en Markdown mais mal formaté

1. Vérifiez que le prompt contient bien les instructions de formatage
2. Vérifiez que les instructions sont claires et précises
3. Testez avec différents prompts pour identifier le problème

## 📚 Ressources

- [Documentation OpenAI Assistants](https://platform.openai.com/docs/assistants/overview)
- [Documentation OpenAI API - Response Format](https://platform.openai.com/docs/api-reference/chat/create#chat-create-response_format)
- [Documentation OpenAI API - Assistants Update](https://platform.openai.com/docs/api-reference/assistants/update)

## 🔄 Migration des Rapports Existants

Pour les rapports déjà générés en JSON :

1. Le parser mis à jour peut maintenant extraire les données du format JSON actuel
2. Pour régénérer les rapports en Markdown :
   - Modifiez la configuration de l'assistant
   - Régénérez les rapports via `/api/generate-report`
   - Les nouveaux rapports seront en Markdown

## ✅ Résultat Attendu

Après configuration, les nouveaux rapports générés doivent :

- Commencer par `# Recommandations et plan d'action`
- Contenir les sections Markdown attendues :
  - `## Introduction contextuelle`
  - `## Évaluation du niveau de risque AI Act`
  - `### Les 3 priorités d'actions réglementaires`
  - `### Quick wins & actions immédiates recommandées`
  - `### Actions à moyen terme`
  - `## Impact attendu`
  - `## Conclusion`

Le parser pourra alors extraire correctement toutes les données.
