const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// IDs réels des cas d'usage de MaydAI (vus dans les logs)
const maydaiUseCaseIds = [
  '5d996313-8484-4b15-a571-4210fcb1235f', // Détecteur de fraude
  '7cedcfb1-77b7-416a-b992-faadcc4edff8', // Tri candidature
  'fe8d68cd-6727-4e6c-95ac-9fe10d7d2379', // Assistant planificateur
  '20783d2a-0b95-41d8-af78-281acc368eab', // Assistant déduplication
  '2ae1546d-e9ca-4d1c-beee-8b4896595139', // Scoring Leads
  '17cb8793-f5e3-431a-9694-743555294453', // Assistant IA premiers secours
  'ebdb7d48-1013-49ec-9fc3-394eba9003ca', // Traducteur de pages HTML
  '10ed9939-6100-4e1b-88c5-6e888250e799', // Sas entrée Biométrique
  'bf216518-2481-43b1-85c7-f40867b4494c', // Assistant Code NextJS
  '6425c4e0-b3b6-43ee-ba4a-74780d2d24ee', // Assistant contenus Marketing
  '4b7ffffe-1cb9-426d-a251-d5c81f43bad2'  // Trieur de CV
]

// Données de démonstration pour les vrais IDs de MaydAI
const demoData = maydaiUseCaseIds.map((usecaseId, index) => {
  const templates = [
    {
      introduction: 'Système de détection de fraude utilisant des algorithmes d\'IA pour analyser les transactions en temps réel.',
      evaluation: 'Niveau de risque limité - Le système traite des données financières sensibles mais avec des mesures de sécurité appropriées.',
      impact: 'Amélioration significative de la détection des fraudes avec réduction des faux positifs.',
      conclusion: 'Le système nécessite une conformité RGPD stricte et une surveillance continue.',
      priorite_1: 'Conduire une analyse d\'impact sur la protection des données (AIPD)',
      priorite_2: 'Mettre en place un système de traçabilité des décisions automatisées',
      priorite_3: 'Établir des procédures de validation humaine des alertes de fraude',
      quick_win_1: 'Documenter les sources de données utilisées par le système',
      quick_win_2: 'Créer un registre des traitements de données personnelles',
      quick_win_3: 'Former les équipes aux obligations du RGPD',
      action_1: 'Développer un système de monitoring en continu',
      action_2: 'Mettre en place des tests de biais réguliers',
      action_3: 'Créer un comité d\'éthique IA'
    },
    {
      introduction: 'Système de tri automatique des candidatures pour la location d\'appartements.',
      evaluation: 'Niveau de risque inacceptable - Discrimination potentielle basée sur des critères protégés.',
      impact: 'Risque élevé de discrimination et de violation des droits fondamentaux.',
      conclusion: 'Ce système nécessite une refonte complète pour respecter les principes d\'égalité.',
      priorite_1: 'Arrêter immédiatement l\'utilisation du système',
      priorite_2: 'Conduire un audit de conformité anti-discrimination',
      priorite_3: 'Refondre l\'algorithme pour éliminer les biais discriminatoires',
      quick_win_1: 'Documenter tous les critères de sélection utilisés',
      quick_win_2: 'Former les équipes sur les biais algorithmiques',
      quick_win_3: 'Mettre en place un processus de validation humaine',
      action_1: 'Développer un nouveau système conforme aux principes d\'égalité',
      action_2: 'Mettre en place des tests de non-discrimination',
      action_3: 'Créer un comité de diversité et d\'inclusion'
    },
    {
      introduction: 'Assistant IA pour la planification optimale des tournées de livraison.',
      evaluation: 'Niveau de risque limité - Optimisation logistique sans traitement de données sensibles.',
      impact: 'Amélioration de l\'efficacité logistique et réduction des coûts.',
      conclusion: 'Système conforme avec quelques améliorations recommandées.',
      priorite_1: 'Documenter les algorithmes d\'optimisation utilisés',
      priorite_2: 'Mettre en place un système de validation des itinéraires',
      priorite_3: 'Établir des procédures de transparence algorithmique',
      quick_win_1: 'Créer une documentation technique complète',
      quick_win_2: 'Mettre en place des logs de décision',
      quick_win_3: 'Former les utilisateurs aux fonctionnalités du système',
      action_1: 'Développer un tableau de bord de monitoring',
      action_2: 'Mettre en place des tests de performance',
      action_3: 'Créer un processus d\'amélioration continue'
    },
    {
      introduction: 'Système de déduplication automatique des données comptables.',
      evaluation: 'Niveau de risque limité - Traitement de données financières avec mesures de sécurité.',
      impact: 'Amélioration de la qualité des données comptables et réduction des erreurs.',
      conclusion: 'Système conforme avec recommandations d\'amélioration.',
      priorite_1: 'Conduire une analyse d\'impact sur la protection des données',
      priorite_2: 'Mettre en place un système de validation des déduplications',
      priorite_3: 'Établir des procédures de correction des erreurs',
      quick_win_1: 'Documenter les règles de déduplication',
      quick_win_2: 'Créer un registre des traitements',
      quick_win_3: 'Former les équipes comptables',
      action_1: 'Développer un système de monitoring des déduplications',
      action_2: 'Mettre en place des tests de qualité des données',
      action_3: 'Créer un processus d\'audit des déduplications'
    },
    {
      introduction: 'Système de scoring automatique des leads entrants pour la qualification commerciale.',
      evaluation: 'Niveau de risque limité - Traitement de données commerciales avec mesures appropriées.',
      impact: 'Amélioration de l\'efficacité commerciale et de la qualification des prospects.',
      conclusion: 'Système conforme avec quelques améliorations recommandées.',
      priorite_1: 'Documenter les critères de scoring utilisés',
      priorite_2: 'Mettre en place un système de validation des scores',
      priorite_3: 'Établir des procédures de transparence du scoring',
      quick_win_1: 'Créer une documentation des critères de scoring',
      quick_win_2: 'Mettre en place des logs de décision',
      quick_win_3: 'Former les équipes commerciales',
      action_1: 'Développer un tableau de bord de scoring',
      action_2: 'Mettre en place des tests de performance du scoring',
      action_3: 'Créer un processus d\'amélioration du scoring'
    }
  ]

  return {
    usecase_id: usecaseId,
    ...templates[index % templates.length]
  }
})

async function insertDemoData() {
  console.log('🚀 Insertion des données de démonstration pour les vrais IDs de MaydAI...')
  
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
  
  console.log('🎉 Insertion terminée pour MaydAI !')
}

insertDemoData()
