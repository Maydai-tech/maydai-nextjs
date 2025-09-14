const { createClient } = require('@supabase/supabase-js')

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const usecaseId = '6425c4e0-b3b6-43ee-ba4a-74780d2d24ee'

async function debugReportContent() {
  console.log('🔍 Analyse du contenu du rapport pour:', usecaseId)
  console.log('=' * 60)

  try {
    // Récupérer le rapport
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('report_summary')
      .eq('id', usecaseId)
      .single()

    if (usecaseError || !usecase.report_summary) {
      console.error('❌ Rapport non trouvé')
      return
    }

    const report = usecase.report_summary
    console.log('📄 Taille du rapport:', report.length, 'caractères')
    
    // Chercher la section priorités
    const prioritiesMatch = report.match(/### Les 3 priorités d'actions réglementaires\s*\n([\s\S]*?)(?=###|##|$)/)
    
    if (prioritiesMatch) {
      console.log('\n✅ Section priorités trouvée')
      const prioritiesSection = prioritiesMatch[1]
      console.log('📝 Contenu de la section priorités:')
      console.log('=' * 40)
      console.log(prioritiesSection)
      console.log('=' * 40)
      
      // Tester différents regex
      console.log('\n🔍 Test des regex d\'extraction:')
      
      // Regex actuel
      const currentRegex = /\*\*(\d+\.\s*)?([^*]+)\*\*/g
      const currentMatches = prioritiesSection.match(currentRegex)
      console.log('1. Regex actuel:', currentMatches ? currentMatches.length : 0, 'matches')
      if (currentMatches) {
        currentMatches.forEach((match, i) => {
          console.log(`   ${i+1}. "${match}"`)
        })
      }
      
      // Regex proposé
      const proposedRegex = /\*\*([^*]+\.)\*\*/g
      const proposedMatches = prioritiesSection.match(proposedRegex)
      console.log('2. Regex proposé:', proposedMatches ? proposedMatches.length : 0, 'matches')
      if (proposedMatches) {
        proposedMatches.forEach((match, i) => {
          console.log(`   ${i+1}. "${match}"`)
        })
      }
      
      // Regex plus permissif
      const flexibleRegex = /\*\*([^*]+?)\*\*/g
      const flexibleMatches = prioritiesSection.match(flexibleRegex)
      console.log('3. Regex flexible:', flexibleMatches ? flexibleMatches.length : 0, 'matches')
      if (flexibleMatches) {
        flexibleMatches.forEach((match, i) => {
          console.log(`   ${i+1}. "${match}"`)
        })
      }
      
    } else {
      console.log('❌ Section priorités non trouvée')
      
      // Chercher des patterns similaires
      console.log('\n🔍 Recherche de patterns similaires:')
      const similarPatterns = report.match(/### .*priorit.*\s*\n([\s\S]*?)(?=###|##|$)/gi)
      if (similarPatterns) {
        console.log('Patterns trouvés:', similarPatterns.length)
        similarPatterns.forEach((pattern, i) => {
          console.log(`${i+1}. "${pattern.substring(0, 100)}..."`)
        })
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

// Exécuter le débogage
debugReportContent().then(() => {
  console.log('\n✅ Analyse terminée')
  process.exit(0)
}).catch(error => {
  console.error('❌ Erreur fatale:', error)
  process.exit(1)
})
