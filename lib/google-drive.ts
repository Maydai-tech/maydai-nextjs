import { google, type drive_v3 } from 'googleapis'

export type DriveFile = drive_v3.Schema$File

/**
 * Client Google Drive (Service Account), toujours compatible Shared Drives.
 * Variables : GOOGLE_DRIVE_CLIENT_EMAIL + GOOGLE_DRIVE_PRIVATE_KEY
 * (fallback : GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY)
 */
export function getDriveClient() {
  const clientEmail =
    process.env.GOOGLE_DRIVE_CLIENT_EMAIL ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawPrivateKey =
    process.env.GOOGLE_DRIVE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY
  const privateKey = rawPrivateKey?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    throw new Error(
      'GOOGLE_DRIVE_CLIENT_EMAIL ou GOOGLE_DRIVE_PRIVATE_KEY manquant(e)'
    )
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })

  return google.drive({ version: 'v3', auth })
}

/** Échappe les apostrophes pour la requête Drive `q` */
export function escapeDriveName(name: string): string {
  return name.replace(/'/g, "\\'")
}

/**
 * Télécharge le contenu texte d’un fichier Drive par ID.
 * Toujours avec supportsAllDrives: true (Shared Drives).
 */
export async function getFileFromDrive(fileId: string): Promise<string> {
  const drive = getDriveClient()
  const fileRes = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'text' }
  )

  const content = fileRes.data
  if (typeof content !== 'string') {
    throw new Error(`Contenu invalide pour le fichier Drive: ${fileId}`)
  }

  return content
}

/**
 * Télécharge un fichier Drive en binaire (PDF, etc.).
 * Toujours avec supportsAllDrives: true (Shared Drives).
 */
export async function getBinaryFileFromDrive(fileId: string): Promise<Buffer> {
  const drive = getDriveClient()
  const fileRes = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  )

  const data = fileRes.data
  if (Buffer.isBuffer(data)) {
    return data
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data)
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength)
  }
  throw new Error(`Contenu binaire invalide pour le fichier Drive: ${fileId}`)
}

/**
 * Liste les fichiers (non corbeille) directement contenus dans un dossier.
 * Compatible Shared Drives.
 */
export async function listFilesInFolder(
  folderId: string
): Promise<DriveFile[]> {
  const drive = getDriveClient()
  const listRes = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType, modifiedTime)',
    pageSize: 1000,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'allDrives',
  })

  return listRes.data.files ?? []
}

/**
 * Résout un fichier par nom dans le Shared Drive (ou dossier) racine.
 * Utilise GOOGLE_DRIVE_SHARED_ROOT_ID, avec fallback GOOGLE_DRIVE_KB_FOLDER_ID.
 */
export async function findFileIdByName(fileName: string): Promise<string> {
  const drive = getDriveClient()
  const escapedName = escapeDriveName(fileName)
  const rootId =
    process.env.GOOGLE_DRIVE_SHARED_ROOT_ID?.trim() ||
    process.env.GOOGLE_DRIVE_KB_FOLDER_ID?.trim()
  const baseQuery = `name='${escapedName}' and trashed=false`

  // 1) Shared Drive MaydAI (ID type 0A…)
  let listRes = rootId
    ? await drive.files.list({
        q: baseQuery,
        fields: 'files(id, name)',
        pageSize: 10,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'drive',
        driveId: rootId,
      })
    : await drive.files.list({
        q: baseQuery,
        fields: 'files(id, name)',
        pageSize: 10,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      })

  let files = listRes.data.files ?? []

  // 2) Fallback si l’ID est un dossier (pas un Shared Drive root)
  if (files.length === 0 && rootId) {
    listRes = await drive.files.list({
      q: `${baseQuery} and '${rootId}' in parents`,
      fields: 'files(id, name)',
      pageSize: 10,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'allDrives',
    })
    files = listRes.data.files ?? []
  }

  const fileId = files[0]?.id
  if (!fileId) {
    throw new Error(`Fichier Google Drive introuvable: ${fileName}`)
  }

  return fileId
}
