/**
 * Partie 4 — écrit dans le Google Sheet, après accord.
 * Archive l'onglet, insère « Action humaine requise », ajuste les protections,
 * crée « Actions humaines » et met à jour le mode d'emploi.
 *
 *   pnpm dlx tsx scripts/control-tower-human-actions.ts --write
 */
import dotenv from 'dotenv'
import path from 'node:path'

import { installControlTowerHumanActions } from '@/lib/bench-llm/control-tower-human-actions'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })

async function main(): Promise<void> {
  if (!process.argv.includes('--write')) {
    console.log('Aucune écriture. Relancer avec --write après accord pour appliquer la partie 4.')
    return
  }
  const spreadsheetId = process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID?.trim()
  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_CONTROL_TOWER_ID est requis')
  const report = await installControlTowerHumanActions(spreadsheetId)
  console.log(JSON.stringify(report, null, 2))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
