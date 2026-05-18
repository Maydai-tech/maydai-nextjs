#!/usr/bin/env node

/**
 * Script pour tester l'assistant OpenAI et connaître ses instructions système
 * Usage: node scripts/test-assistant-instructions.js
 */

require('dotenv').config({ path: '.env.local' })

// Configuration OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY manquante dans .env.local')
  process.exit(1)
}

if (!OPENAI_ASSISTANT_ID) {
  console.error('❌ OPENAI_ASSISTANT_ID manquante dans .env.local')
  process.exit(1)
}

/**
 * Test de l'assistant OpenAI avec l'API Assistants
 */
async function testAssistantInstructions() {
  console.log('🤖 Test de l\'assistant OpenAI - Instructions système')
  console.log(`📋 Assistant ID: ${OPENAI_ASSISTANT_ID}`)
  console.log(`🔑 API Key: ${OPENAI_API_KEY.substring(0, 10)}...`)
  console.log('─'.repeat(60))

  try {
    // 1. Créer un thread
    console.log('\n1️⃣ Création du thread...')
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({})
    })

    if (!threadResponse.ok) {
      const error = await threadResponse.text()
      throw new Error(`Erreur création thread: ${threadResponse.status} - ${error}`)
    }

    const thread = await threadResponse.json()
    console.log('✅ Thread créé:', thread.id)

    // 2. Ajouter un message au thread
    console.log('\n2️⃣ Ajout du message...')
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: 'Quel est ton rôle exact selon tes instructions système ?'
      })
    })

    if (!messageResponse.ok) {
      const error = await messageResponse.text()
      throw new Error(`Erreur ajout message: ${messageResponse.status} - ${error}`)
    }

    const message = await messageResponse.json()
    console.log('✅ Message ajouté:', message.id)

    // 3. Lancer le run avec l'assistant
    console.log('\n3️⃣ Lancement du run avec l\'assistant...')
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: OPENAI_ASSISTANT_ID
      })
    })

    if (!runResponse.ok) {
      const error = await runResponse.text()
      throw new Error(`Erreur lancement run: ${runResponse.status} - ${error}`)
    }

    const run = await runResponse.json()
    console.log('✅ Run lancé:', run.id)

    // 4. Attendre la completion du run
    console.log('\n4️⃣ Attente de la completion...')
    let currentRun = run
    let attempts = 0
    const maxAttempts = 60 // 60 secondes max

    while (currentRun.status === 'queued' || currentRun.status === 'in_progress') {
      if (attempts >= maxAttempts) {
        throw new Error('Timeout: Le run n\'a pas terminé après 60 secondes')
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++

      // Vérifier le statut du run
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      })

      if (statusResponse.ok) {
        currentRun = await statusResponse.json()
        if (attempts % 10 === 0) {
          console.log(`⏱️  Statut du run (${attempts}s): ${currentRun.status}`)
        }
      }
    }

    if (currentRun.status !== 'completed') {
      throw new Error(`Le run a terminé avec un statut inattendu: ${currentRun.status}`)
    }

    console.log('✅ Run terminé avec succès')

    // 5. Récupérer la réponse de l'assistant
    console.log('\n5️⃣ Récupération de la réponse...')
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    })

    if (!messagesResponse.ok) {
      const error = await messagesResponse.text()
      throw new Error(`Erreur récupération messages: ${messagesResponse.status} - ${error}`)
    }

    const messagesData = await messagesResponse.json()
    
    // Trouver la dernière réponse de l'assistant
    const assistantMessage = messagesData.data
      .filter(msg => msg.role === 'assistant')
      .sort((a, b) => b.created_at - a.created_at)[0]

    if (assistantMessage && assistantMessage.content[0] && assistantMessage.content[0].type === 'text') {
      console.log('\n📄 RÉPONSE DE L\'ASSISTANT:')
      console.log('─'.repeat(60))
      console.log(assistantMessage.content[0].text.value)
      console.log('─'.repeat(60))
    } else {
      console.log('❌ Aucune réponse textuelle trouvée')
    }

    // 6. Nettoyer le thread
    console.log('\n6️⃣ Nettoyage du thread...')
    try {
      await fetch(`https://api.openai.com/v1/threads/${thread.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      })
      console.log('✅ Thread nettoyé')
    } catch (cleanupError) {
      console.warn('⚠️  Impossible de nettoyer le thread:', cleanupError.message)
    }

    console.log('\n🎉 Test terminé avec succès!')

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message)
  }
}

// Lancer le test
testAssistantInstructions()



