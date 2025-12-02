import Mailjet from 'node-mailjet';

// Configuration
const TEMPLATES = {
  COLLABORATION_INVITE: 7438322, // Template pour invitation au niveau registre
  ACCOUNT_COLLABORATION_INVITE: 7438326 // Template pour invitation au niveau compte
} as const;

const FROM_EMAIL = 'tech@maydai.io';
const FROM_NAME = 'MaydAI';

// Client Mailjet
const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY!,
  process.env.MAILJET_SECRET_KEY!
);

// Fonction d'envoi pour invitation au niveau registre (registry-level)
export async function sendRegistryCollaborationInvite({
  collaboratorEmail,
  collaboratorFirstName,
  collaboratorLastName,
  inviterName,
  companyName
}: {
  collaboratorEmail: string;
  collaboratorFirstName: string;
  collaboratorLastName: string;
  inviterName: string;
  companyName: string;
}) {
  const variables = {
    registryName: companyName,
    inviter_name: inviterName,
    first_name: collaboratorFirstName,
    last_name: collaboratorLastName,
    email: collaboratorEmail
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
                Name: `${collaboratorFirstName} ${collaboratorLastName}`
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
  collaboratorLastName,
  inviterName
}: {
  collaboratorEmail: string;
  collaboratorFirstName: string;
  collaboratorLastName: string;
  inviterName: string;
}) {
  const variables = {
    inviter_name: inviterName,
    first_name: collaboratorFirstName,
    last_name: collaboratorLastName,
    email: collaboratorEmail
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
                Name: `${collaboratorFirstName} ${collaboratorLastName}`
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
