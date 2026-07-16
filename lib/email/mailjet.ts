import Mailjet from 'node-mailjet';
import type { LlmStatsSyncResult } from '@/lib/bench-llm/llm-stats-sync';

// Configuration
const TEMPLATES = {
  COLLABORATION_INVITE: 7438322, // Template pour invitation au niveau registre
  ACCOUNT_COLLABORATION_INVITE: 7576574, // Template pour invitation au niveau compte
  HUMAN_OVERSIGHT_INVITE: 8083771, // Template invitation surveillance humaine (cas d'usage)
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

function escapeHtml(value: unknown): string {
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

export async function sendAdminContactNotification(data: ContactNotificationPayload) {
  const mailjet = getMailjetClient();
  if (!mailjet) {
    return mailjetNotConfiguredError();
  }

  const originLabel =
    data.source === 'contact_page' ? 'Site Vitrine (Commercial)' : 'Centre de Support';
  const htmlContent = `
    <h3>Nouvelle demande : ${data.subject}</h3>
    <ul>
      <li><strong>Origine :</strong> ${originLabel}</li>
      <li><strong>Utilisateur :</strong> ${data.first_name} ${data.last_name} (${data.email})</li>
      <li><strong>Téléphone :</strong> ${data.phone || 'Non renseigné'}</li>
    </ul>
    <h4>Message :</h4>
    <p>${data.message || 'Aucun message.'}</p>
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
