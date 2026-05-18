/**
 * Script pour inspecter le contenu réel du rapport
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function inspectReport(usecaseId: string) {
  const { data: usecase } = await supabase
    .from('usecases')
    .select('id, name, report_summary')
    .eq('id', usecaseId)
    .single()

  if (!usecase?.report_summary) {
    console.error('❌ Aucun rapport trouvé')
    return
  }

  console.log('📄 === CONTENU COMPLET DU RAPPORT ===\n')
  console.log(usecase.report_summary)
  console.log('\n📄 === FIN DU RAPPORT ===\n')

  // Analyser les premières lignes pour identifier le format
  const lines = usecase.report_summary.split('\n').slice(0, 50)
  console.log('📋 === PREMIÈRES 50 LIGNES ===\n')
  lines.forEach((line: string, index: number) => {
    console.log(`${index + 1}: ${line}`)
  })
}

const usecaseId = process.argv[2] || '5f6c216e-6ed5-47d1-a61e-266c5b4fe91e'

inspectReport(usecaseId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erreur:', error)
    process.exit(1)
  })







































