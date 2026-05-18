const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// IDs réels des cas d'usage vus dans la console
const realUseCaseIds = [
  '97b6e58e-0759-4e1d-8b2c-b1cb05d213fb',
  '48eb6c0d-aabc-4cca-8eea-0e45c1ba0851', 
  '98517778-024d-4971-b66f-80930784e296'
]

// Données de démonstration pour les vrais IDs
const demoData = realUseCaseIds.map((usecaseId, index) => {
  const templates = [
    {
      introduction: 'Système de traduction automatique de pages HTML pour le marketing web.',
      evaluation: 'Niveau de risque limité - Traitement de contenu public avec mesures de sécurité appropriées.',
      impact: 'Amélioration de l\'efficacité de localisation et réduction des coûts de traduction.',
      conclusion: 'Système conforme avec quelques améliorations recommandées.',
      priorite_1: 'Conduire une analyse d\'impact sur la protection des données (AIPD)',
      priorite_2: 'Mettre en place un système de traçabilité des traductions',
      priorite_3: 'Établir des procédures de validation linguistique',
      quick_win_1: 'Documenter les sources de données utilisées par le système',
      quick_win_2: 'Créer un registre des traitements de données personnelles',
      quick_win_3: 'Former les équipes aux obligations du RGPD',
      action_1: 'Développer un système de monitoring en continu',
      action_2: 'Mettre en place des tests de qualité linguistique',
      action_3: 'Créer un comité d\'éthique IA'
    },
    {
      introduction: 'Système de contrôle d\'accès biométrique pour l\'entrée des employés.',
      evaluation: 'Niveau de risque élevé - Traitement de données biométriques sensibles.',
      impact: 'Amélioration de la sécurité mais nécessite une conformité stricte.',
      conclusion: 'Système nécessitant des mesures de sécurité renforcées.',
      priorite_1: 'Conduire une analyse d\'impact sur la protection des données (AIPD)',
      priorite_2: 'Mettre en place un système de traçabilité des accès',
      priorite_3: 'Établir des procédures de validation des accès',
      quick_win_1: 'Documenter les données biométriques collectées',
      quick_win_2: 'Créer un registre des traitements de données sensibles',
      quick_win_3: 'Former les équipes aux obligations du RGPD',
      action_1: 'Développer un système de monitoring des accès',
      action_2: 'Mettre en place des tests de sécurité biométrique',
      action_3: 'Créer un comité de sécurité des données'
    },
    {
      introduction: 'Assistant IA pour la formation et l\'assistance aux premiers secours.',
      evaluation: 'Niveau de risque inacceptable - Risque de conseils médicaux incorrects.',
      impact: 'Risque élevé de dommages en cas de conseils médicaux erronés.',
      conclusion: 'Ce système nécessite une refonte complète pour respecter les normes médicales.',
      priorite_1: 'Arrêter immédiatement l\'utilisation du système',
      priorite_2: 'Conduire un audit de conformité médicale',
      priorite_3: 'Refondre l\'algorithme pour éliminer les risques médicaux',
      quick_win_1: 'Documenter tous les conseils médicaux fournis',
      quick_win_2: 'Former les équipes sur les risques médicaux',
      quick_win_3: 'Mettre en place un processus de validation médicale',
      action_1: 'Développer un nouveau système conforme aux normes médicales',
      action_2: 'Mettre en place des tests de sécurité médicale',
      action_3: 'Créer un comité médical de validation'
    }
  ]

  return {
    usecase_id: usecaseId,
    ...templates[index % templates.length]
  }
})

async function insertDemoData() {
  console.log('🚀 Insertion des données de démonstration pour les vrais IDs...')
  
  for (const data of demoData) {
    try {
      const { error } = await supabase
        .from('usecase_nextsteps')
        .upsert(data, { onConflict: 'usecase_id' })
      
      if (error) {
        console.error(`❌ Erreur pour ${data.usecase_id}:`, error.message)
      } else {
        console.log(`✅ Données insérées pour ${data.usecase_id}`)
      }
    } catch (err) {
      console.error(`❌ Erreur lors de l'insertion de ${data.usecase_id}:`, err.message)
    }
  }
  
  console.log('🎉 Insertion terminée !')
}

insertDemoData()
