import Mailjet from 'node-mailjet';
import type { LlmStatsSyncResult } from '@/lib/bench-llm/llm-stats-sync';
import {
  MailjetGovernanceSendResultSchema,
  SendDeletionConfirmationEmailParamsSchema,
  SendPurgeCompletedEmailParamsSchema,
  type MailjetGovernanceSendResult,
} from '@/lib/validations/mailjet-governance';

// Configuration
const TEMPLATES = {
  COLLABORATION_INVITE: 7438322, // Template pour invitation au niveau registre
  ACCOUNT_COLLABORATION_INVITE: 7576574, // Template pour invitation au niveau compte
  HUMAN_OVERSIGHT_INVITE: 8083771, // Template invitation surveillance humaine (cas d'usage)
  DELETION_CONFIRM: 8508863,
  PURGE_COMPLETED: 8508931,
} as const;

/** Template Mailjet — campagne acquisition (lead Google Ads). */
const MAILJET_LEAD_INVITE_TEMPLATE_ID = '7948763';

const FROM_EMAIL = 'tech@maydai.io';
const FROM_NAME = 'MaydAI';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.maydai.io';
const LLM_STATS_SYNC_RECIPIENTS = [
  { Email: 'tech@maydai.io', Name: 'MaydAI Tech' },
  { Email: 'hugo.faye@gmail.com', Name: 'Hugo Faye' },
] as const;

type MailjetClient = ReturnType<typeof Mailjet.apiConnect>;

let mailjetClient: MailjetClient | null = null;

function getMailjetClient(): MailjetClient | null {
  const apiKey = process.env.MAILJET_API_KEY;
  const apiSecret = process.env.MAILJET_API_SECRET;

  if (!apiKey || !apiSecret) {
    return null;
  }

  if (!mailjetClient) {
    mailjetClient = Mailjet.apiConnect(apiKey, apiSecret);
  }

  return mailjetClient;
}

function mailjetNotConfiguredError(): { success: false; error: Error } {
  console.error(
    '❌ [Mailjet] Client non initialisé:',
    'MAILJET_API_KEY ou MAILJET_API_SECRET manquant',
  );
  return {
    success: false,
    error: new Error('MAILJET_API_KEY ou MAILJET_API_SECRET manquant'),
  };
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderModelChanges(
  title: string,
  models: LlmStatsSyncResult['createdModels'],
): string {
  if (models.length === 0) {
    return `<h3>${escapeHtml(title)} (0)</h3><p>Aucun modèle.</p>`
  }

  const rows = models
    .map((model) => {
      const changedFields = model.changedFields?.length
        ? `<br/><small>Champs: ${escapeHtml(model.changedFields.join(', '))}</small>`
        : ''
      return `<li><strong>${escapeHtml(model.model_provider)}</strong> - ${escapeHtml(model.model_name)}${changedFields}</li>`
    })
    .join('')

  return `<h3>${escapeHtml(title)} (${models.length})</h3><ul>${rows}</ul>`
}

export async function sendLlmStatsSyncReportEmail(result: LlmStatsSyncResult) {
  const mailjet = getMailjetClient();
  if (!mailjet) {
    return mailjetNotConfiguredError();
  }

  const statusLabel = result.success ? 'réussie' : 'partielle';
  const htmlContent = `
    <h2>Synchronisation LLM Stats ${escapeHtml(statusLabel)}</h2>
    <p><strong>Début :</strong> ${escapeHtml(result.startedAt)}</p>
    <p><strong>Fin :</strong> ${escapeHtml(result.finishedAt)}</p>
    <p><strong>Durée :</strong> ${escapeHtml(result.durationMs)} ms</p>
    <ul>
      <li><strong>Modèles récupérés :</strong> ${escapeHtml(result.modelsFetched)}</li>
      <li><strong>Créés :</strong> ${escapeHtml(result.modelsCreated)}</li>
      <li><strong>Mis à jour :</strong> ${escapeHtml(result.modelsUpdated)}</li>
      <li><strong>Inchangés :</strong> ${escapeHtml(result.modelsUnchanged)}</li>
    </ul>
    ${renderModelChanges('Modèles créés', result.createdModels)}
    ${renderModelChanges('Modèles mis à jour', result.updatedModels)}
    ${
      result.errors.length > 0
        ? `<h3>Erreurs (${result.errors.length})</h3><ul>${result.errors
            .map((error) => `<li>${escapeHtml(error)}</li>`)
            .join('')}</ul>`
        : '<p>Aucune erreur.</p>'
    }
  `;

  try {
    const request = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: FROM_EMAIL,
            Name: FROM_NAME,
          },
          To: [...LLM_STATS_SYNC_RECIPIENTS],
          Subject: `[MaydAI] Sync LLM Stats ${statusLabel} - ${result.modelsCreated} créés, ${result.modelsUpdated} mis à jour`,
          HTMLPart: htmlContent,
        },
      ],
    });

    console.log('[LLM Stats Sync] Email de rapport envoyé', request.body);
    return { success: true, data: request.body };
  } catch (error) {
    console.error('[LLM Stats Sync] Erreur envoi email de rapport:', error);
    return { success: false, error };
  }
}

export async function sendLlmStatsSyncFailureEmail(error: unknown, context?: Record<string, unknown>) {
  const mailjet = getMailjetClient();
  if (!mailjet) {
    return mailjetNotConfiguredError();
  }

  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : null
  const htmlContent = `
    <h2>Synchronisation LLM Stats échouée</h2>
    <p><strong>Erreur :</strong> ${escapeHtml(errorMessage)}</p>
    ${
      errorStack
        ? `<h3>Stack</h3><pre>${escapeHtml(errorStack)}</pre>`
        : ''
    }
    ${
      context
        ? `<h3>Contexte</h3><pre>${escapeHtml(JSON.stringify(context, null, 2))}</pre>`
        : ''
    }
  `;

  try {
    const request = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: FROM_EMAIL,
            Name: FROM_NAME,
          },
          To: [...LLM_STATS_SYNC_RECIPIENTS],
          Subject: `[MaydAI] Sync LLM Stats échouée - ${errorMessage.slice(0, 120)}`,
          HTMLPart: htmlContent,
        },
      ],
    });

    console.log("[LLM Stats Sync] Email d'échec envoyé", request.body);
    return { success: true, data: request.body };
  } catch (sendError) {
    console.error("[LLM Stats Sync] Erreur envoi email d'échec:", sendError);
    return { success: false, error: sendError };
  }
}

// Fonction d'envoi pour invitation au niveau registre (registry-level)
export async function sendRegistryCollaborationInvite({
  collaboratorEmail,
  collaboratorFirstName,
  inviterName,
  companyName
}: {
  collaboratorEmail: string;
  collaboratorFirstName: string;
  inviterName: string;
  companyName: string;
}) {
  const mailjet = getMailjetClient();
  if (!mailjet) {
    return mailjetNotConfiguredError();
  }

  const ctaLink = `${APP_URL}/login?email=${encodeURIComponent(collaboratorEmail)}`;
  const variables = {
    firstName: collaboratorFirstName,
    inviterName: inviterName,
    registryName: companyName,
    ctaLink: ctaLink
  };

  try {
    const result = await mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: FROM_EMAIL,
              Name: FROM_NAME
            },
            To: [
              {
                Email: collaboratorEmail,
                Name: collaboratorFirstName
              }
            ],
            TemplateID: TEMPLATES.COLLABORATION_INVITE,
            TemplateLanguage: true,
            Subject: `Invitation à collaborer - ${companyName}`,
            Variables: variables
          }
        ]
      });

    // Log detailed response
    const response = result.body as any;
    console.log('✅ [Mailjet] Email sent successfully:', {
      to: collaboratorEmail,
      status: response.Messages?.[0]?.Status,
      messageId: response.Messages?.[0]?.To?.[0]?.MessageID,
      messageUUID: response.Messages?.[0]?.To?.[0]?.MessageUUID
    });

    return { success: true, data: result.body };
  } catch (err: any) {
    console.error('❌ [Mailjet] Failed to send email:', {
      to: collaboratorEmail,
      statusCode: err.statusCode,
      message: err.message,
      errorMessage: err.response?.body?.ErrorMessage,
      errorIdentifier: err.response?.body?.ErrorIdentifier,
      fullError: err.response?.body
    });
    return { success: false, error: err };
  }
}

export interface SendHumanOversightInviteParams {
  email: string
  firstName: string
  inviterName: string
  usecaseName: string
  ctaLink: string
}

export async function sendHumanOversightInvite(params: SendHumanOversightInviteParams) {
  const client = getMailjetClient()
  if (!client) {
    throw new Error('MAILJET_API_KEY ou MAILJET_API_SECRET manquant')
  }

  console.log(
    `[Mailjet] Envoi invitation Surveillance Humaine à ${params.email} pour le cas d'usage: ${params.usecaseName}`
  )

  try {
    const request = await client.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: FROM_EMAIL,
            Name: FROM_NAME,
          },
          To: [
            {
              Email: params.email,
              Name: params.firstName,
            },
          ],
          TemplateID: TEMPLATES.HUMAN_OVERSIGHT_INVITE,
          TemplateLanguage: true,
          Subject: `Invitation : Responsable de la surveillance humaine pour ${params.usecaseName}`,
          Variables: {
            firstName: params.firstName,
            inviterName: params.inviterName,
            usecaseName: params.usecaseName,
            ctaLink: params.ctaLink,
          },
        },
      ],
    })

    return request.body
  } catch (error) {
    console.error("[Mailjet] Échec de l'envoi de l'invitation Surveillance Humaine:", error)
    throw new Error("Erreur lors de l'envoi de l'email d'invitation.")
  }
}

// Fonction d'envoi pour invitation au niveau compte (account-level)
export async function sendAccountCollaborationInvite({
  collaboratorEmail,
  collaboratorFirstName,
  inviterName,
  orgName
}: {
  collaboratorEmail: string;
  collaboratorFirstName: string;
  inviterName: string;
  orgName: string;
}) {
  const mailjet = getMailjetClient();
  if (!mailjet) {
    return mailjetNotConfiguredError();
  }

  const ctaLink = `${APP_URL}/login?email=${encodeURIComponent(collaboratorEmail)}`;
  const variables = {
    firstName: collaboratorFirstName,
    inviterName: inviterName,
    orgName: orgName,
    ctaLink: ctaLink
  };

  console.log('📧 [Mailjet] Sending account collaboration invite:', {
    to: collaboratorEmail,
    from: FROM_EMAIL,
    templateId: TEMPLATES.ACCOUNT_COLLABORATION_INVITE,
    variables
  });

  try {
    const result = await mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: FROM_EMAIL,
              Name: FROM_NAME
            },
            To: [
              {
                Email: collaboratorEmail,
                Name: collaboratorFirstName
              }
            ],
            TemplateID: TEMPLATES.ACCOUNT_COLLABORATION_INVITE,
            TemplateLanguage: true,
            Subject: `Invitation à collaborer sur MaydAI`,
            Variables: variables
          }
        ]
      });

    // Log detailed response
    const response = result.body as any;
    console.log('✅ [Mailjet] Account invitation email sent successfully:', {
      to: collaboratorEmail,
      status: response.Messages?.[0]?.Status,
      messageId: response.Messages?.[0]?.To?.[0]?.MessageID,
      messageUUID: response.Messages?.[0]?.To?.[0]?.MessageUUID
    });

    return { success: true, data: result.body };
  } catch (err: any) {
    console.error('❌ [Mailjet] Failed to send account invitation email:', {
      to: collaboratorEmail,
      statusCode: err.statusCode,
      message: err.message,
      errorMessage: err.response?.body?.ErrorMessage,
      errorIdentifier: err.response?.body?.ErrorIdentifier,
      fullError: err.response?.body
    });
    return { success: false, error: err };
  }
}

function leadInviteSignupBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.maydai.io').trim();
  return raw.replace(/\/+$/, '');
}

/** Email post-capture lead (Google Ads). Template Mailjet : variables `firstName`, `ctaLink`. */
export async function sendLeadInviteEmail({
  leadEmail,
  firstName,
  leadId,
}: {
  leadEmail: string;
  firstName: string;
  leadId: string;
}) {
  const mailjet = getMailjetClient();
  if (!mailjet) {
    return mailjetNotConfiguredError();
  }

  const safeFirstName = (firstName ?? '').trim();
  const templateId = Number.parseInt(MAILJET_LEAD_INVITE_TEMPLATE_ID, 10);

  const ctaLink = `${leadInviteSignupBaseUrl()}/signup?lead_id=${encodeURIComponent(leadId)}`;

  const variables = {
    firstName: safeFirstName,
    ctaLink,
  };

  try {
    const result = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: FROM_EMAIL,
            Name: FROM_NAME,
          },
          To: [
            {
              Email: leadEmail,
              Name: safeFirstName || leadEmail,
            },
          ],
          TemplateID: templateId,
          TemplateLanguage: true,
          Subject: 'MaydAI',
          Variables: variables,
        },
      ],
    });

    const response = result.body as any;
    console.log('✅ [Mailjet] Email lead envoyé:', {
      to: leadEmail,
      leadId,
      status: response.Messages?.[0]?.Status,
    });

    return { success: true, data: result.body };
  } catch (err: any) {
    console.error('❌ [Mailjet] Échec email lead:', {
      to: leadEmail,
      leadId,
      statusCode: err.statusCode,
      message: err.message,
      errorMessage: err.response?.body?.ErrorMessage,
    });
    return { success: false, error: err };
  }
}

// Type basé sur le payload Zod existant
export type ContactNotificationPayload = {
  subject: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  source?: string;
};

/**
 * Neutralise (Defanging SOC/CERT) toutes les URLs et noms de domaine présents dans un texte
 * en remplaçant http(s) par hxxp(s), le dernier point du domaine par [.] et en enveloppant dans <code>.
 * Le texte d'entrée est d'abord échappé contre le XSS HTML.
 */
export function defangUrlsForEmail(rawText: string): string {
  const escaped = escapeHtml(rawText);

  const urlOrDomainRegex =
    /(?:https?:\/\/|www\.)[^\s<"]+|\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}\b(?:\/[^\s<"]*)?/gi;

  const defanged = escaped.replace(urlOrDomainRegex, (match) => {
    // Séparer la ponctuation finale éventuelle (.,;!) sans casser une entité HTML (&gt;, &amp;…).
    let end = match.length;
    while (end > 0 && /[.,;!?]/.test(match[end - 1])) {
      if (match[end - 1] === ';' && /&(?:#\d+|[a-z]+)$/i.test(match.slice(0, end - 1))) {
        break;
      }
      end -= 1;
    }
    const trailingPunct = match.slice(end);
    const cleanMatch = match.slice(0, end);

    // 1. Neutraliser le protocole http/https -> hxxp/hxxps
    const protocolNeutralized = cleanMatch.replace(/^http(s?):\/\//i, 'hxxp$1://');

    // 2. Neutraliser le dernier point du hostname (domaine[.]tld)
    const slashIndex = protocolNeutralized.indexOf('/', protocolNeutralized.indexOf('://') + 3);
    const hasProtocol = /^hxxps?:\/\//i.test(protocolNeutralized);
    const hostSplitIndex = hasProtocol
      ? slashIndex
      : protocolNeutralized.indexOf('/');

    let hostPart =
      hostSplitIndex === -1
        ? protocolNeutralized
        : protocolNeutralized.slice(0, hostSplitIndex);
    const pathPart =
      hostSplitIndex === -1 ? '' : protocolNeutralized.slice(hostSplitIndex);

    const lastDotIndex = hostPart.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      hostPart = `${hostPart.slice(0, lastDotIndex)}[.]${hostPart.slice(lastDotIndex + 1)}`;
    }

    return `<code style="background:#f3f4f6;padding:2px 4px;border-radius:3px;font-family:monospace;color:#111827;">${hostPart}${pathPart}</code>${trailingPunct}`;
  });

  return defanged.replace(/\r?\n/g, '<br />');
}

export async function sendAdminContactNotification(data: ContactNotificationPayload) {
  const mailjet = getMailjetClient();
  if (!mailjet) {
    return mailjetNotConfiguredError();
  }

  const originLabel =
    data.source === 'contact_page' ? 'Site Vitrine (Commercial)' : 'Centre de Support';

  const safeSubject = escapeHtml(data.subject);
  const safeFirstName = escapeHtml(data.first_name);
  const safeLastName = escapeHtml(data.last_name);
  const safeEmail = defangUrlsForEmail(data.email);
  const safePhone = data.phone ? escapeHtml(data.phone) : 'Non renseigné';
  const safeMessage = data.message
    ? defangUrlsForEmail(data.message)
    : 'Aucun message.';

  const htmlContent = `
    <h3>Nouvelle demande : ${safeSubject}</h3>
    <ul>
      <li><strong>Origine :</strong> ${originLabel}</li>
      <li><strong>Utilisateur :</strong> ${safeFirstName} ${safeLastName} (${safeEmail})</li>
      <li><strong>Téléphone :</strong> ${safePhone}</li>
    </ul>
    <h4>Message :</h4>
    <p>${safeMessage}</p>
  `;

  try {
    const request = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: 'contact@maydai.io',
            Name: 'MaydAI Bot',
          },
          To: [
            {
              Email: 'tech@maydai.io',
              Name: 'MaydAI Tech Team',
            },
          ],
          ReplyTo: {
            Email: data.email,
            Name: `${data.first_name} ${data.last_name}`.trim(),
          },
          Subject: `Nouveau Contact Site Web : ${data.subject} - ${data.first_name} ${data.last_name}`,
          HTMLPart: htmlContent,
        },
      ],
    });

    console.log('[Contact Web] Notification admin envoyée', request.body);
    return { success: true };
  } catch (error) {
    console.error('[Contact Web] Erreur critique envoi notification admin:', error);
    return { success: false, error };
  }
}

function resolveTemplateId(envName: string, defaultTemplateId: number): number {
  const raw = process.env[envName]?.trim()
  if (!raw) return defaultTemplateId
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultTemplateId
  return parsed
}

function entityTypeLabel(entityType: 'company' | 'usecase'): string {
  return entityType === 'company' ? 'registre' : "cas d'usage"
}

interface MailjetSendResponseBody {
  Messages?: Array<{
    Status?: string
    To?: Array<{
      MessageID?: string | number
      MessageUUID?: string
    }>
  }>
}

function readMailjetStatusCode(source: unknown): number | null {
  if (!source || typeof source !== 'object') return null
  const status = (source as { status?: unknown; statusCode?: unknown }).status
  const statusCode = (source as { statusCode?: unknown }).statusCode
  if (typeof status === 'number') return status
  if (typeof statusCode === 'number') return statusCode
  return null
}

function buildGovernanceSendResult(input: {
  templateId: number
  body?: unknown
  statusCode?: number | null
  error?: unknown
}): MailjetGovernanceSendResult {
  const body = input.body as MailjetSendResponseBody | undefined
  const message = body?.Messages?.[0]
  const recipient = message?.To?.[0]
  const errorMessage =
    input.error instanceof Error
      ? input.error.message
      : input.error
        ? String(input.error)
        : null

  return MailjetGovernanceSendResultSchema.parse({
    success: !input.error && message?.Status === 'success',
    templateId: input.templateId,
    statusCode: input.statusCode ?? null,
    messageStatus: typeof message?.Status === 'string' ? message.Status : null,
    messageId: recipient?.MessageID ?? null,
    messageUuid: typeof recipient?.MessageUUID === 'string' ? recipient.MessageUUID : null,
    errorMessage,
  })
}

export async function sendDeletionConfirmationEmail(params: {
  toEmail: string
  firstName?: string | null
  entityName: string
  entityType: 'company' | 'usecase'
  confirmationLink: string
}): Promise<MailjetGovernanceSendResult> {
  const templateId = resolveTemplateId(
    'MAILJET_DELETION_CONFIRM_TEMPLATE_ID',
    TEMPLATES.DELETION_CONFIRM
  )
  const parsed = SendDeletionConfirmationEmailParamsSchema.safeParse(params)
  if (!parsed.success) {
    console.error('[Mailjet sendDeletionConfirmationEmail]', parsed.error)
    return buildGovernanceSendResult({
      templateId,
      error: new Error('Paramètres de confirmation de suppression invalides'),
    })
  }

  const mailjet = getMailjetClient()
  if (!mailjet) {
    const error = new Error('Client Mailjet absent')
    console.error('[Mailjet sendDeletionConfirmationEmail]', error)
    return buildGovernanceSendResult({ templateId, error })
  }

  const label = entityTypeLabel(parsed.data.entityType)
  const upgradeLink = `${APP_URL}/abonnement`
  const variables = {
    first_name: parsed.data.firstName || '',
    firstName: parsed.data.firstName || '',
    entity_name: parsed.data.entityName,
    entityName: parsed.data.entityName,
    entity_type_label: label,
    entityTypeLabel: label,
    registryName: parsed.data.entityName,
    confirmation_link: parsed.data.confirmationLink,
    confirmationLink: parsed.data.confirmationLink,
    ctaLink: parsed.data.confirmationLink,
    upgrade_link: upgradeLink,
    upgradeLink: upgradeLink,
  }

  try {
    const result = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: { Email: FROM_EMAIL, Name: FROM_NAME },
          To: [{ Email: parsed.data.toEmail, Name: parsed.data.firstName || parsed.data.toEmail }],
          TemplateID: templateId,
          TemplateLanguage: true,
          TemplateErrorReporting: { Email: FROM_EMAIL, Name: FROM_NAME },
          TemplateErrorDeliver: false,
          Subject: `Confirmation de demande de suppression – ${parsed.data.entityName} (Délai de sécurité 24h)`,
          Variables: variables,
        },
      ],
    })
    return buildGovernanceSendResult({
      templateId,
      body: result.body,
      statusCode: readMailjetStatusCode(result.response),
    })
  } catch (error) {
    console.error('[Mailjet sendDeletionConfirmationEmail]', error)
    const response = (error as { response?: { status?: number; body?: unknown } }).response
    return buildGovernanceSendResult({
      templateId,
      body: response?.body,
      statusCode: readMailjetStatusCode(response) ?? readMailjetStatusCode(error),
      error,
    })
  }
}

export async function sendPurgeCompletedEmail(params: {
  toEmail: string
  firstName?: string | null
  entityName: string
  entityType: 'company' | 'usecase'
  dashboardLink?: string
}): Promise<MailjetGovernanceSendResult> {
  const templateId = resolveTemplateId(
    'MAILJET_PURGE_COMPLETED_TEMPLATE_ID',
    TEMPLATES.PURGE_COMPLETED
  )
  const parsed = SendPurgeCompletedEmailParamsSchema.safeParse(params)
  if (!parsed.success) {
    console.error('[Mailjet sendPurgeCompletedEmail]', parsed.error)
    return buildGovernanceSendResult({
      templateId,
      error: new Error('Paramètres de fin de purge invalides'),
    })
  }

  const mailjet = getMailjetClient()
  if (!mailjet) {
    const error = new Error('Client Mailjet absent')
    console.error('[Mailjet sendPurgeCompletedEmail]', error)
    return buildGovernanceSendResult({ templateId, error })
  }

  const label = entityTypeLabel(parsed.data.entityType)
  const dashboardLink = parsed.data.dashboardLink || `${APP_URL}/dashboard/registries`
  const variables = {
    first_name: parsed.data.firstName || '',
    firstName: parsed.data.firstName || '',
    entity_name: parsed.data.entityName,
    entityName: parsed.data.entityName,
    entity_type_label: label,
    entityTypeLabel: label,
    registryName: parsed.data.entityName,
    dashboard_link: dashboardLink,
    dashboardLink: dashboardLink,
    ctaLink: dashboardLink,
  }

  try {
    const result = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: { Email: FROM_EMAIL, Name: FROM_NAME },
          To: [{ Email: parsed.data.toEmail, Name: parsed.data.firstName || parsed.data.toEmail }],
          TemplateID: templateId,
          TemplateLanguage: true,
          TemplateErrorReporting: { Email: FROM_EMAIL, Name: FROM_NAME },
          TemplateErrorDeliver: false,
          Subject: 'Suppression effectuée – Votre espace MaydAI est disponible',
          Variables: variables,
        },
      ],
    })
    return buildGovernanceSendResult({
      templateId,
      body: result.body,
      statusCode: readMailjetStatusCode(result.response),
    })
  } catch (error) {
    console.error('[Mailjet sendPurgeCompletedEmail]', error)
    const response = (error as { response?: { status?: number; body?: unknown } }).response
    return buildGovernanceSendResult({
      templateId,
      body: response?.body,
      statusCode: readMailjetStatusCode(response) ?? readMailjetStatusCode(error),
      error,
    })
  }
}
