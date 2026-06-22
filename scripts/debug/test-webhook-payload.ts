/**
 * Preuve QA — webhook Google Leads local (sans toucher la prod).
 *
 * Modes :
 *   --parse-only   Parse + Zod + simulation insert — aucun HTTP, aucune écriture Supabase
 *   (défaut)       POST vers localhost — nécessite `npm run dev` + .env.local (Supabase DEV)
 *
 * Usage :
 *   npx tsx scripts/debug/test-webhook-payload.ts --parse-only
 *   GOOGLE_WEBHOOK_SECRET=xxx npx tsx scripts/debug/test-webhook-payload.ts
 *   GOOGLE_WEBHOOK_SECRET=xxx npx tsx scripts/debug/test-webhook-payload.ts --url http://localhost:3000/api/webhooks/google-leads
 *
 * ⚠️  N’utilisez PAS ce script contre https://www.maydai.io (prod).
 *     Le mode POST insère dans la base pointée par NEXT_PUBLIC_SUPABASE_URL de .env.local.
 */

import 'dotenv/config'

import { extractGoogleLeadFields } from '../../lib/google-ads/utils'
import { LeadInsertSchema } from '../../lib/validations/leads'

const DEFAULT_WEBHOOK_URL = 'http://localhost:3000/api/webhooks/google-leads'

/** Payload réaliste : champs formulaire OK, pas de gclid / wbraid / gbraid. */
function buildWebhookBody(secret: string) {
  const unique = Date.now()
  return {
    google_key: secret,
    is_test: true,
    campaign_id: 12345678901,
    campaign_name: 'QA Debug — Lead Form sans GCLID',
    ad_group_name: 'QA Ad Group',
    user_column_data: [
      {
        column_id: 'EMAIL',
        string_value: `qa-webhook-debug-${unique}@maydai-test.invalid`,
      },
      { column_id: 'FIRST_NAME', string_value: 'QA' },
      { column_id: 'LAST_NAME', string_value: 'WebhookDebug' },
      { column_id: 'PHONE_NUMBER', string_value: '+33601020304' },
      { column_id: 'COMPANY_NAME', string_value: 'MaydAI QA Sandbox' },
    ],
    // Pas de gclid, gcl_id, google_click_id, lead_data.gclid, ni column_id GCLID
  }
}

function simulateWebhookInsertRow(
  extracted: ReturnType<typeof extractGoogleLeadFields>,
  body: ReturnType<typeof buildWebhookBody>
) {
  const gclidForClickId = extracted.gclid?.trim() || null

  return {
    email: extracted.email!.trim().toLowerCase(),
    first_name: extracted.first_name,
    last_name: extracted.last_name,
    phone: extracted.phone,
    company_name: extracted.company_name,
    gclid: gclidForClickId,
    click_id: gclidForClickId,
    campaign_name: extracted.campaign_name,
    ad_group_name: extracted.ad_group_name,
    source: 'google_ads_form' as const,
    funnel_stage: 0,
    total_revenue: 0,
  }
}

function parseOnly(body: ReturnType<typeof buildWebhookBody>): void {
  console.log('='.repeat(72))
  console.log('QA — Webhook Google Leads (--parse-only, aucun HTTP / aucune DB)')
  console.log('='.repeat(72))
  console.log()

  console.log('[1] Payload JSON envoyé (simulation)')
  console.log(JSON.stringify(body, null, 2))
  console.log()

  const extracted = extractGoogleLeadFields(body, new URLSearchParams())
  console.log('[2] extractGoogleLeadFields()')
  console.log(JSON.stringify(extracted, null, 2))
  console.log()

  if (!extracted.gclid) {
    console.log('⚠️  gclid absent — la route loguera :')
    console.log(
      '    "[google-leads] Aucun gclid dans le payload Google — click_id non renseigné pour ce lead"'
    )
    console.log('    → gclid et click_id seront NULL en base.')
  }
  console.log()

  const insertRow = simulateWebhookInsertRow(extracted, body)
  const { funnel_stage, total_revenue, ...leadInsertPayload } = insertRow

  console.log('[3] Ligne insertRow (miroir app/api/webhooks/google-leads/route.ts)')
  console.log(JSON.stringify(insertRow, null, 2))
  console.log()

  const leadValidation = LeadInsertSchema.safeParse(leadInsertPayload)
  console.log('[4] LeadInsertSchema.safeParse()')
  if (leadValidation.success) {
    console.log('✅ Zod OK — le payload passerait la validation')
    console.log(JSON.stringify(leadValidation.data, null, 2))
  } else {
    console.log('🔴 Zod KO — échec avant insert Supabase')
    console.log(JSON.stringify(leadValidation.error.format(), null, 2))
  }
  console.log()

  console.log('[5] Insert Supabase simulé (sans exécution)')
  console.log(
    JSON.stringify(
      {
        ...leadValidation.success ? leadValidation.data : leadInsertPayload,
        funnel_stage,
        total_revenue,
      },
      null,
      2
    )
  )
  console.log()
  console.log(
    'Pour observer les logs Next.js réels : relancer sans --parse-only (dev server requis).'
  )
}

async function postWebhook(
  body: ReturnType<typeof buildWebhookBody>,
  webhookUrl: string
): Promise<void> {
  if (/maydai\.io/i.test(webhookUrl) && !/localhost|127\.0\.0\.1/i.test(webhookUrl)) {
    console.error(
      '🔴 Refus : URL prod détectée. Utilisez localhost ou --parse-only pour ne pas polluer la prod.'
    )
    process.exit(1)
  }

  console.log('='.repeat(72))
  console.log('QA — Webhook Google Leads (POST local)')
  console.log('='.repeat(72))
  console.log(`URL  : ${webhookUrl}`)
  console.log(`Test : is_test=true (Mailjet ignoré côté API)`)
  console.log()
  console.log('Payload :')
  console.log(JSON.stringify(body, null, 2))
  console.log()
  console.log('→ Surveillez le terminal où tourne `npm run dev` pour les logs [google-leads].')
  console.log()

  let res: Response
  try {
    res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error('🔴 Impossible de joindre le serveur local.')
    console.error(
      err instanceof Error ? err.message : String(err)
    )
    console.error('   Assurez-vous que `npm run dev` écoute sur localhost:3000.')
    process.exit(1)
  }

  const text = await res.text()
  let json: unknown = text
  try {
    json = JSON.parse(text)
  } catch {
    /* réponse non-JSON */
  }

  console.log(`[HTTP ${res.status}] Réponse API`)
  console.log(typeof json === 'string' ? json : JSON.stringify(json, null, 2))
  console.log()

  if (res.ok) {
    console.log('✅ Webhook accepté — une ligne a été insérée dans la base DEV (.env.local).')
    console.log('   Email test :', body.user_column_data[0]?.string_value)
  } else if (res.status === 409) {
    console.log('ℹ️  409 duplicate_email — relancez (timestamp unique) ou utilisez --parse-only.')
  } else {
    console.log('🔴 Échec — voir logs serveur + réponse ci-dessus.')
  }
}

function parseWebhookUrl(): string {
  const idx = process.argv.indexOf('--url')
  if (idx !== -1 && typeof process.argv[idx + 1] === 'string') {
    return process.argv[idx + 1]
  }
  return process.env.WEBHOOK_DEBUG_URL ?? DEFAULT_WEBHOOK_URL
}

async function main(): Promise<void> {
  const parseOnlyMode = process.argv.includes('--parse-only')
  const secret = process.env.GOOGLE_WEBHOOK_SECRET?.trim()

  if (parseOnlyMode) {
    parseOnly(buildWebhookBody(secret ?? 'qa-parse-only-placeholder-secret'))
    return
  }

  if (!secret) {
    console.error(
      'GOOGLE_WEBHOOK_SECRET manquant. Copiez la valeur depuis .env.local ou utilisez --parse-only.'
    )
    process.exit(1)
  }

  const body = buildWebhookBody(secret)

  await postWebhook(body, parseWebhookUrl())
}

main().catch((err) => {
  console.error('Erreur fatale :', err)
  process.exit(1)
})
