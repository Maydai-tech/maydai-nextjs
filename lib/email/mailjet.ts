import Mailjet from 'node-mailjet';

// Configuration
const TEMPLATES = {
  COLLABORATION_INVITE: 7438322, // Template pour invitation au niveau registre
  ACCOUNT_COLLABORATION_INVITE: 7576574 // Template pour invitation au niveau compte
} as const;

const FROM_EMAIL = 'tech@maydai.io';
const FROM_NAME = 'MaydAI';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.maydai.io';

// Client Mailjet
const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY!,
  process.env.MAILJET_SECRET_KEY!
);

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
  const safeFirstName = (firstName ?? '').trim();
  const templateIdRaw = process.env.MAILJET_LEAD_INVITE_TEMPLATE_ID;
  if (!templateIdRaw) {
    console.warn(
      '⚠️ [Mailjet] MAILJET_LEAD_INVITE_TEMPLATE_ID non défini — email lead ignoré'
    );
    return { success: false, error: new Error('MAILJET_LEAD_INVITE_TEMPLATE_ID manquant') };
  }

  const templateId = Number.parseInt(templateIdRaw, 10);
  if (Number.isNaN(templateId)) {
    console.error('❌ [Mailjet] MAILJET_LEAD_INVITE_TEMPLATE_ID invalide:', templateIdRaw);
    return { success: false, error: new Error('MAILJET_LEAD_INVITE_TEMPLATE_ID invalide') };
  }

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
