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

async function debugUsecase() {
  console.log('🔍 Débogage du use case:', usecaseId)
  console.log('=' * 50)

  try {
    // 1. Vérifier si le use case existe
    console.log('\n1. Vérification du use case...')
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('id, name, report_summary, report_generated_at, company_id')
      .eq('id', usecaseId)
      .single()

    if (usecaseError) {
      console.error('❌ Erreur récupération use case:', usecaseError)
      return
    }

    console.log('✅ Use case trouvé:', usecase.name)
    console.log('📅 Rapport généré le:', usecase.report_generated_at)
    console.log('📄 Rapport existe:', !!usecase.report_summary)

    // 2. Vérifier les données usecase_nextsteps
    console.log('\n2. Vérification des données usecase_nextsteps...')
    const { data: nextSteps, error: nextStepsError } = await supabase
      .from('usecase_nextsteps')
      .select('*')
      .eq('usecase_id', usecaseId)
      .single()

    if (nextStepsError) {
      if (nextStepsError.code === 'PGRST116') {
        console.log('❌ Aucune donnée usecase_nextsteps trouvée')
      } else {
        console.error('❌ Erreur récupération nextsteps:', nextStepsError)
      }
    } else {
      console.log('✅ Données usecase_nextsteps trouvées:')
      console.log('  - priorite_1:', nextSteps.priorite_1 ? '✅' : '❌')
      console.log('  - priorite_2:', nextSteps.priorite_2 ? '✅' : '❌')
      console.log('  - priorite_3:', nextSteps.priorite_3 ? '✅' : '❌')
      console.log('  - quick_win_1:', nextSteps.quick_win_1 ? '✅' : '❌')
      console.log('  - quick_win_2:', nextSteps.quick_win_2 ? '✅' : '❌')
      console.log('  - quick_win_3:', nextSteps.quick_win_3 ? '✅' : '❌')
      console.log('  - action_1:', nextSteps.action_1 ? '✅' : '❌')
      console.log('  - action_2:', nextSteps.action_2 ? '✅' : '❌')
      console.log('  - action_3:', nextSteps.action_3 ? '✅' : '❌')
      
      if (nextSteps.priorite_1) {
        console.log('\n📝 Contenu priorite_1:', nextSteps.priorite_1.substring(0, 100) + '...')
      }
    }

    // 3. Analyser le rapport si il existe
    if (usecase.report_summary) {
      console.log('\n3. Analyse du rapport...')
      const report = usecase.report_summary
      
      // Vérifier le format du rapport
      const isJSON = report.startsWith('{') && report.endsWith('}')
      const isMarkdown = report.includes('##') || report.includes('###')
      
      console.log('📄 Format du rapport:')
      console.log('  - JSON:', isJSON ? '✅' : '❌')
      console.log('  - Markdown:', isMarkdown ? '✅' : '❌')
      
      // Chercher les sections priorités
      const prioritiesMatch = report.match(/### Les 3 priorités d'actions réglementaires\s*\n([\s\S]*?)(?=###|##|$)/)
      if (prioritiesMatch) {
        console.log('✅ Section priorités trouvée dans le rapport')
        const prioritiesSection = prioritiesMatch[1]
        const priorityMatches = prioritiesSection.match(/\*\*([^*]+\.)\*\*/g)
        console.log('🔍 Nombre de priorités extraites:', priorityMatches ? priorityMatches.length : 0)
        
        if (priorityMatches && priorityMatches.length > 0) {
          console.log('📝 Première priorité extraite:', priorityMatches[0].substring(0, 100) + '...')
        }
      } else {
        console.log('❌ Section priorités non trouvée dans le rapport')
      }
    }

    // 4. Vérifier les logs récents
    console.log('\n4. Vérification des logs récents...')
    const { data: logs, error: logsError } = await supabase
      .from('logs')
      .select('*')
      .eq('usecase_id', usecaseId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (logsError) {
      console.log('⚠️ Pas de logs trouvés ou erreur:', logsError.message)
    } else {
      console.log('📋 Derniers logs:')
      logs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log.created_at}: ${log.message}`)
      })
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

// Exécuter le débogage
debugUsecase().then(() => {
  console.log('\n✅ Débogage terminé')
  process.exit(0)
}).catch(error => {
  console.error('❌ Erreur fatale:', error)
  process.exit(1)
})
