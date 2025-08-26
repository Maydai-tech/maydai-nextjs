#!/usr/bin/env node

/**
 * Script de test pour le service Mistral AI
 * Usage: node scripts/test-mistral-ai.js
 */

// Simulation des variables d'environnement
process.env.NEXT_PUBLIC_MISTRAL_API_KEY = 'olhsQPx89dO9BrZutjjMh5KNuVEJzRsl'
process.env.NEXT_PUBLIC_MISTRAL_ID_API = 'ag:91e23ddf:20250707:resume-cas-usage-ia:9c55ed1d'
process.env.NEXT_PUBLIC_MISTRAL_API_URL = 'https://api.mistral.ai/v1'

// Import du service (simulation)
class MistralAIService {
  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_MISTRAL_API_KEY || ''
    this.agentId = process.env.NEXT_PUBLIC_MISTRAL_ID_API || ''
    this.apiUrl = process.env.NEXT_PUBLIC_MISTRAL_API_URL || 'https://api.mistral.ai/v1'
  }

  buildPrompt(formData) {
    return `
Génère une description professionnelle et technique d'un cas d'usage IA basée sur ces informations :

**Nom du cas d'usage :** ${formData.name || 'Non spécifié'}
**Catégorie d'IA :** ${formData.ai_category || 'Non spécifiée'}
**Type de système :** ${formData.system_type || 'Non spécifié'}
**Pays de déploiement :** ${formData.deployment_countries || 'Non spécifiés'}
**Partenaire technologique :** ${formData.technology_partner || 'Non spécifié'}
**Modèle LLM :** ${formData.llm_model_version || 'Non spécifié'}
**Service responsable :** ${formData.responsible_service || 'Non spécifié'}
**Date de déploiement :** ${formData.deployment_date || 'Non spécifiée'}

**Instructions :**
- Décris l'objectif principal du système IA
- Explique le fonctionnement technique
- Mentionne les aspects de conformité IA Act UE
- Sois précis et professionnel
- Limite à 200-300 mots
- Format : paragraphe structuré

Génère uniquement la description, sans titre ni introduction.
    `.trim()
  }

  async testConnection() {
    try {
      console.log('🔑 Test de connexion Mistral AI...')
      console.log(`API Key: ${this.apiKey ? '✅ Présente' : '❌ Manquante'}`)
      console.log(`Agent ID: ${this.agentId ? '✅ Présent' : '❌ Manquant'}`)
      console.log(`API URL: ${this.apiUrl}`)
      
      // Test de la construction du prompt
      const testData = {
        name: 'Assistant IA pour Support Client',
        ai_category: 'Large Language Model (LLM)',
        system_type: 'Produit',
        deployment_countries: 'France, Belgique',
        technology_partner: 'Mistral',
        llm_model_version: 'Mistral Large',
        responsible_service: 'Service Client',
        deployment_date: '01/09/2024'
      }
      
      const prompt = this.buildPrompt(testData)
      console.log('\n📝 Prompt généré:')
      console.log('─'.repeat(50))
      console.log(prompt)
      console.log('─'.repeat(50))
      
      console.log('\n✅ Test de base réussi !')
      console.log('\n📋 Prochaines étapes:')
      console.log('1. Créer le fichier .env.local avec vos clés')
      console.log('2. Tester l\'API route /api/mistral/generate-description')
      console.log('3. Vérifier l\'intégration dans le questionnaire')
      
    } catch (error) {
      console.error('❌ Erreur lors du test:', error)
    }
  }
}

// Exécution du test
const mistralService = new MistralAIService()
mistralService.testConnection()
