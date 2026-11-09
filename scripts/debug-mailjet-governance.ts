/**
 * Crash test Mailjet : syntaxe des templates publiés, puis délivrabilité réelle.
 *
 * Commande :
 *   pnpm debug:mailjet-governance
 */

import * as path from 'path'
import * as dotenv from 'dotenv'
import {
  sendDeletionConfirmationEmail,
  sendPurgeCompletedEmail,
} from '../lib/email/mailjet'
import {
  MailjetMessageDeliveryCheckSchema,
  type MailjetGovernanceSendResult,
  type MailjetMessageDeliveryCheck,
} from '../lib/validations/mailjet-governance'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const RECIPIENT = 'thomas@mayday-consulting.ai'
const ENTITY_NAME = 'Assistant Marketing Contenus (Test Crash Mailjet)'
const TEMPLATE_IDS = [8508863, 8508931] as const
const BROKEN_MARKDOWN_IN_VAR = /\{\{var:[^}]*\[https:\/\//g
const BROKEN_NAMED_VARS = /\{\{var:(?:upgrade_link|dashboard_link):\[/g
const MARKDOWN_VAR_LINK =
  /\{\{var:([A-Za-z0-9_]+):\[(https?:\/\/[^\]\s]+)\]\([^)]*\)\}\}/g

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`ÉCHEC : ${message}`)
    process.exit(1)
  }
  console.log(`OK : ${message}`)
}

function mailjetAuth(): string {
  const key = process.env.MAILJET_API_KEY
  const secret = process.env.MAILJET_API_SECRET
  if (!key || !secret) {
    console.error('[Mailjet debug]', 'MAILJET_API_KEY ou MAILJET_API_SECRET absent')
    process.exit(1)
  }
  return `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`
}

async function mailjetGet(url: string): Promise<{ status: number; text: string }> {
  const response = await fetch(url, { headers: { Authorization: mailjetAuth() } })
  const text = await response.text()
  if (!response.ok) {
    console.error('[Mailjet debug]', url, response.status, text.slice(0, 1000))
    process.exit(1)
  }
  return { status: response.status, text }
}

function repairTemplateLanguage(source: string): { next: string; hits: string[] } {
  const hits = source.match(MARKDOWN_VAR_LINK) ?? []
  const next = source.replace(MARKDOWN_VAR_LINK, (_full, name: string, url: string) => {
    return `{{var:${name}:"${url}"}}`
  })
  return { next, hits }
}

function residualBroken(source: string): string[] {
  return [...(source.match(BROKEN_MARKDOWN_IN_VAR) ?? []), ...(source.match(BROKEN_NAMED_VARS) ?? [])]
}

interface TemplateParts {
  headers: Record<string, unknown> | null
  html: string
  text: string
  mjml: string
}

function readTemplateParts(raw: string): TemplateParts {
  const payload = JSON.parse(raw) as { Data?: Array<Record<string, unknown>> }
  const item = payload.Data?.[0] ?? {}
  return {
    headers: (item.Headers as Record<string, unknown> | undefined) ?? null,
    html: String(item['Html-part'] ?? ''),
    text: String(item['Text-part'] ?? ''),
    mjml: String(item.MJMLContent ?? ''),
  }
}

async function ensureTemplatesAreParsable(): Promise<void> {
  for (const templateId of TEMPLATE_IDS) {
    const url = `https://api.mailjet.com/v3/REST/template/${templateId}/detailcontent`
    const first = await mailjetGet(url)
    const parts = readTemplateParts(first.text)
    const broken = {
      html: [...new Set([...residualBroken(parts.html), ...(repairTemplateLanguage(parts.html).hits)])],
      text: [...new Set([...residualBroken(parts.text), ...(repairTemplateLanguage(parts.text).hits)])],
      mjml: [...new Set([...residualBroken(parts.mjml), ...(repairTemplateLanguage(parts.mjml).hits)])],
    }
    const found = broken.html.length + broken.text.length + broken.mjml.length
    if (found === 0) {
      console.log(`OK : template ${templateId} sans lien Markdown dans {{var:...}}`)
      continue
    }

    console.error(`[Mailjet debug] syntaxe cassée dans le template ${templateId}`, broken)
    const htmlRepair = repairTemplateLanguage(parts.html)
    const textRepair = repairTemplateLanguage(parts.text)
    const mjmlRepair = repairTemplateLanguage(parts.mjml)
    const stillBroken = [
      ...residualBroken(htmlRepair.next),
      ...residualBroken(textRepair.next),
      ...residualBroken(mjmlRepair.next),
    ]
    if (stillBroken.length > 0) {
      console.error('[Mailjet debug] syntaxe résiduelle non réparable', stillBroken)
      process.exit(1)
    }

    const update = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: mailjetAuth(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Headers: parts.headers ?? undefined,
        'Html-part': htmlRepair.next,
        'Text-part': textRepair.next,
        ...(parts.mjml ? { MJMLContent: mjmlRepair.next } : {}),
      }),
    })
    const updateText = await update.text()
    if (!update.ok) {
      console.error('[Mailjet debug] échec correction template', templateId, update.status, updateText.slice(0, 1500))
      process.exit(1)
    }

    const verified = readTemplateParts((await mailjetGet(url)).text)
    const leftover = [
      ...residualBroken(verified.html),
      ...residualBroken(verified.text),
      ...residualBroken(verified.mjml),
    ]
    if (leftover.length > 0) {
      console.error('[Mailjet debug] le template publié contient encore', leftover)
      process.exit(1)
    }
    console.log(`OK : template ${templateId} corrigé (${htmlRepair.hits.length} HTML, ${textRepair.hits.length} texte, ${mjmlRepair.hits.length} MJML)`)
  }
}

function printProof(label: string, result: MailjetGovernanceSendResult): void {
  console.log(`[Mailjet preuve] ${label}`, {
    statusCode: result.statusCode ?? null,
    templateId: result.templateId,
    messageStatus: result.messageStatus ?? null,
    messageId: result.messageId ?? null,
    messageUuid: result.messageUuid ?? null,
    success: result.success,
    errorMessage: result.errorMessage ?? null,
  })
}

async function checkDelivery(messageId: string): Promise<MailjetMessageDeliveryCheck> {
  const message = await mailjetGet(`https://api.mailjet.com/v3/REST/message/${messageId}`)
  const history = await mailjetGet(`https://api.mailjet.com/v3/REST/messagehistory/${messageId}`)
  const messageRow = (JSON.parse(message.text) as { Data?: Array<Record<string, unknown>> }).Data?.[0]
  const historyRows = (JSON.parse(history.text) as { Data?: Array<Record<string, unknown>> }).Data ?? []
  const parsed = MailjetMessageDeliveryCheckSchema.safeParse({
    messageId,
    status: messageRow?.Status,
    statePermanent: messageRow?.StatePermanent,
    attemptCount: messageRow?.AttemptCount,
    historyEvents: historyRows.map((event) => ({
      eventType: typeof event.EventType === 'string' ? event.EventType : undefined,
      state: typeof event.State === 'string' ? event.State : undefined,
    })),
  })
  if (!parsed.success) {
    console.error('[Mailjet debug] statut message invalide', parsed.error)
    process.exit(1)
  }
  console.log(`[Mailjet délivrabilité] ${messageId}`, {
    status: parsed.data.status,
    attemptCount: parsed.data.attemptCount ?? null,
    statePermanent: parsed.data.statePermanent ?? null,
    historyEvents: parsed.data.historyEvents ?? [],
  })
  const templateError = (parsed.data.historyEvents ?? []).some((event) =>
    `${event.eventType ?? ''} ${event.state ?? ''}`.toLowerCase().includes('error in template language')
  )
  if (parsed.data.status === 'blocked' || templateError) {
    console.error('[Mailjet debug] message bloqué ou template invalide', parsed.data)
    process.exit(1)
  }
  return parsed.data
}

async function main(): Promise<void> {
  delete process.env.MAILJET_DELETION_CONFIRM_TEMPLATE_ID
  delete process.env.MAILJET_PURGE_COMPLETED_TEMPLATE_ID

  await ensureTemplatesAreParsable()

  const deletion = await sendDeletionConfirmationEmail({
    toEmail: RECIPIENT,
    firstName: 'Thomas',
    entityName: ENTITY_NAME,
    entityType: 'usecase',
    confirmationLink:
      'https://www.maydai.io/api/governance/confirm-deletion?type=usecase&id=00000000-0000-0000-0000-000000000000&token=test_token_mailjet_crash_check',
  })
  printProof('Email 1 confirmation suppression', deletion)
  assert(deletion.success === true, 'email 1 success')
  assert(deletion.templateId === 8508863, `email 1 templateId = 8508863 (lu ${deletion.templateId})`)
  assert(deletion.messageStatus === 'success', `email 1 messageStatus = success (lu ${deletion.messageStatus})`)
  assert(deletion.messageId != null && String(deletion.messageId) !== '', 'email 1 messageId présent')

  const purge = await sendPurgeCompletedEmail({
    toEmail: RECIPIENT,
    firstName: 'Thomas',
    entityName: ENTITY_NAME,
    entityType: 'usecase',
    dashboardLink: 'https://www.maydai.io/dashboard/registries',
  })
  printProof('Email 2 purge terminée', purge)
  assert(purge.success === true, 'email 2 success')
  assert(purge.templateId === 8508931, `email 2 templateId = 8508931 (lu ${purge.templateId})`)
  assert(purge.messageStatus === 'success', `email 2 messageStatus = success (lu ${purge.messageStatus})`)
  assert(purge.messageId != null && String(purge.messageId) !== '', 'email 2 messageId présent')

  await new Promise((resolve) => setTimeout(resolve, 4000))

  await checkDelivery(String(deletion.messageId))
  await checkDelivery(String(purge.messageId))
}

main()
  .then(() => {
    console.log('OK : debug:mailjet-governance terminé')
  })
  .catch((error: unknown) => {
    console.error('[debug:mailjet-governance]', error)
    process.exit(1)
  })
