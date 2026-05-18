// Script de test pour vérifier l'API des use cases
// À exécuter avec: node scripts/test-api.js

const testApi = async () => {
  try {
    // Remplacez par l'ID d'une entreprise existante
    const companyId = 'YOUR_COMPANY_ID_HERE'
    
    const response = await fetch(`http://localhost:3000/api/companies/${companyId}/usecases`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    console.log('=== Données récupérées ===')
    console.log(`Nombre de cas d'usage: ${data.length}`)
    
    data.forEach((useCase, index) => {
      console.log(`\n--- Cas d'usage ${index + 1} ---`)
      console.log(`ID: ${useCase.id}`)
      console.log(`Nom: ${useCase.name}`)
      console.log(`Statut: ${useCase.status}`)
      console.log(`Technology Partner: ${useCase.technology_partner}`)
      console.log(`LLM Model Version: ${useCase.llm_model_version}`)
      console.log(`Primary Model ID: ${useCase.primary_model_id}`)
      console.log(`COMPL-AI Models:`, useCase.compl_ai_models)
    })
    
  } catch (error) {
    console.error('Erreur lors du test de l\'API:', error)
  }
}

testApi()

