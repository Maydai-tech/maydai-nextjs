# Migration vers l'API OpenAI Assistants

## 📋 Résumé des changements

La classe `OpenAIClient` a été migrée de l'API Chat Completions vers l'API Assistants d'OpenAI pour permettre l'utilisation d'un assistant pré-configuré.

## 🔧 Modifications apportées

### 1. Installation du SDK OpenAI
```bash
npm install openai
```

### 2. Variables d'environnement requises

Ajoutez ces variables à votre fichier `.env.local` :

```env
OPENAI_API_KEY=sk-votre_cle_api_openai
OPENAI_ASSISTANT_ID=asst-votre_id_assistant
```

### 3. Configuration de l'Assistant OpenAI

1. Connectez-vous à [OpenAI Platform](https://platform.openai.com/)
2. Allez dans la section "Assistants"
3. Créez un nouvel assistant ou utilisez un existant
4. Configurez les instructions de l'assistant pour l'analyse de conformité IA Act
5. Copiez l'ID de l'assistant (commence par `asst-`)

## 🔄 Fonctionnement de la nouvelle API

### Avant (Chat Completions)
```javascript
const response = await fetch('/chat/completions', {
  method: 'POST',
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }]
  })
})
```

### Après (Assistants API)
```javascript
const thread = await client.beta.threads.create()
await client.beta.threads.messages.create(thread.id, {
  role: 'user',
  content: prompt
})
const run = await client.beta.threads.runs.create(thread.id, {
  assistant_id: this.assistantId
})
// Attente de la completion...
```

## ✅ Avantages de la migration

1. **Configuration centralisée** : Instructions de l'assistant gérées dans OpenAI Platform
2. **Threading** : Possibilité de conversations suivies (future fonctionnalité)
3. **Outils avancés** : Code interpreter, file search, function calling disponibles
4. **Gestion optimisée** : OpenAI gère automatiquement les tokens et optimisations

## 🧪 Test de l'intégration

Un script de test est disponible :

```bash
OPENAI_API_KEY=sk-xxx OPENAI_ASSISTANT_ID=asst-xxx node test-openai-integration.js
```

## 📁 Fichiers modifiés

- `lib/openai-client.ts` : Refactorisation complète
- `package.json` : Ajout de la dépendance `openai`
- `.env.example` : Documentation des nouvelles variables
- `test-openai-integration.js` : Script de test

## 🔧 Configuration de l'Assistant

Instructions suggérées pour l'assistant OpenAI :

```
Tu es un expert en conformité réglementaire pour l'IA Act européen. 
Ton rôle est d'analyser les réponses au questionnaire de conformité et de fournir :

1. Une évaluation des domaines à risque élevé
2. Une analyse du registre centralisé des systèmes IA
3. Des recommandations d'actions prioritaires
4. Des quick wins (actions rapides à mettre en place)
5. Des actions à moyen terme

Sois précis, professionnel et actionnable dans tes recommandations.
Utilise un ton expert mais accessible, avec une structure claire et des points d'action concrets.
```

## ⚠️ Points d'attention

1. **Coûts** : L'API Assistants peut avoir une tarification différente
2. **Latence** : Le polling pour attendre la completion peut augmenter la latence
3. **Erreurs** : Nouvelle gestion des erreurs liées aux statuts de run
4. **Timeouts** : Prévoir des timeouts pour éviter les boucles infinies

## 🔄 Rollback

En cas de problème, revertez vers l'ancienne implémentation :

```bash
git revert HEAD
npm uninstall openai
```

Et restaurez les variables d'environnement précédentes.