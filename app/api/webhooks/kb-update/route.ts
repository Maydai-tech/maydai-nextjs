import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import Papa from 'papaparse'

/** Durée max Vercel : téléchargement Drive + upsert massif */
export const maxDuration = 60

/** Payload attendu depuis Hermes */
interface KbUpdatePayload {
  event: string
  source: string
  folder_name: string
  subfolder_name: string
  file_name: string
}

/** Ligne CSV brute (en-têtes anglais Compar:IA) */
interface CompariaCsvRow {
  id?: string
  Rank?: string
  'Bradley-Terry Score'?: string
  'Total votes'?: string
  'Consumption mWh (1000 tokens)'?: string
  Size?: string
  'Parameters (B)'?: string
  Architecture?: string
  Release?: string
  Organisation?: string
  License?: string
  [key: string]: string | undefined
}

/** Ligne mappée vers `comparia_rankings` */
interface CompariaRankingRow {
  id: string
  rank: number
  bradley_terry_score: number
  total_votes: number
  consumption_mwh: number | null
  size: string
  parameters_b: number | null
  architecture: string
  release: string
  organisation: string
  license: string
  updated_at: string
}

/** Convertit une cellule CSV en float, ou null si vide / invalide (évite 22P02). */
function safeFloat(val: unknown): number | null {
  if (val === null || val === undefined || val === '' || val === 'NaN') return null
  const parsed = parseFloat(String(val).replace(',', '.'))
  return Number.isNaN(parsed) ? null : parsed
}

/** Convertit une cellule CSV en entier, avec fallback si vide / invalide. */
function safeInt(val: unknown, fallback = 0): number {
  if (val === null || val === undefined || val === '' || val === 'NaN') return fallback
  const parsed = parseInt(String(val), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function mapCsvRowToRanking(row: CompariaCsvRow, updatedAt: string): CompariaRankingRow | null {
  const id = row.id?.trim()
  if (!id) return null

  return {
    id,
    rank: safeInt(row.Rank, 0),
    bradley_terry_score: safeFloat(row['Bradley-Terry Score']) ?? 0,
    total_votes: safeInt(row['Total votes'], 0),
    consumption_mwh: safeFloat(row['Consumption mWh (1000 tokens)']),
    size: String(row.Size || ''),
    parameters_b: safeFloat(row['Parameters (B)']),
    architecture: String(row.Architecture || ''),
    release: String(row.Release || ''),
    organisation: String(row.Organisation || ''),
    license: String(row.License || ''),
    updated_at: updatedAt,
  }
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant(e)'
    )
  }
  return createClient(url, key)
}

function getDriveClient() {
  // Noms Vercel / MaydAI, avec fallback sur les anciens noms
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
function escapeDriveName(name: string): string {
  return name.replace(/'/g, "\\'")
}

async function downloadCsvFromDrive(fileName: string): Promise<string> {
  const drive = getDriveClient()
  const escapedName = escapeDriveName(fileName)
  const kbFolderId = process.env.GOOGLE_DRIVE_KB_FOLDER_ID?.trim()
  const baseQuery = `name='${escapedName}' and trashed=false`

  // 1) Shared Drive MaydAI (GOOGLE_DRIVE_KB_FOLDER_ID type 0A…)
  let listRes = kbFolderId
    ? await drive.files.list({
        q: baseQuery,
        fields: 'files(id, name)',
        pageSize: 10,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'drive',
        driveId: kbFolderId,
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
  if (files.length === 0 && kbFolderId) {
    listRes = await drive.files.list({
      q: `${baseQuery} and '${kbFolderId}' in parents`,
      fields: 'files(id, name)',
      pageSize: 10,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'allDrives',
    })
    files = listRes.data.files ?? []
  }

  if (files.length === 0 || !files[0]?.id) {
    throw new Error(`Fichier Google Drive introuvable: ${fileName}`)
  }

  const fileId = files[0].id
  const fileRes = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'text' }
  )

  const content = fileRes.data
  if (typeof content !== 'string') {
    throw new Error(`Contenu CSV invalide pour le fichier: ${fileName}`)
  }

  return content
}

export async function POST(request: NextRequest) {
  // 1. Vérification de sécurité
  const expectedKey = process.env.INTERNAL_API_KEY
  if (!expectedKey) {
    console.error('[Webhook KB Update] INTERNAL_API_KEY non configuré')
    return NextResponse.json(
      { error: 'Configuration serveur incomplète' },
      { status: 500 }
    )
  }

  const providedKey = request.headers.get('x-api-key')
  if (!providedKey || providedKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 2. Parsing du payload JSON
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
    }

    const payload = body as Partial<KbUpdatePayload>
    const fileName = typeof payload.file_name === 'string' ? payload.file_name.trim() : ''

    if (!fileName) {
      return NextResponse.json(
        { error: 'file_name manquant dans le payload' },
        { status: 400 }
      )
    }

    // 3. Téléchargement CSV depuis Google Drive
    const csvContent = await downloadCsvFromDrive(fileName)

    // 4. Parsing CSV + mapping colonnes
    const parsed = Papa.parse<CompariaCsvRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    })

    if (parsed.errors.length > 0) {
      console.warn('[Webhook KB Update] Erreurs PapaParse:', parsed.errors.slice(0, 5))
    }

    const updatedAt = new Date().toISOString()
    const rows = parsed.data
      .map((row) => mapCsvRowToRanking(row, updatedAt))
      .filter((row): row is CompariaRankingRow => row !== null)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Aucune ligne valide dans le CSV' },
        { status: 400 }
      )
    }

    // 5. Upsert massif dans Supabase (service role, contourne RLS)
    const supabase = getServiceSupabase()
    const { error: upsertError } = await supabase
      .from('comparia_rankings')
      .upsert(rows, { onConflict: 'id' })

    if (upsertError) {
      console.error('[Webhook KB Update] Erreur Upsert Supabase:', upsertError)
      return NextResponse.json(
        {
          error: 'Échec de l’upsert Supabase',
          details: upsertError.message,
          code: upsertError.code,
          hint: upsertError.hint,
        },
        { status: 500 }
      )
    }

    // 6. Succès
    return NextResponse.json({
      success: true,
      models_updated: rows.length,
    })
  } catch (error) {
    console.error('[Webhook KB Update]', error)
    const details = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Erreur interne du webhook KB Update', details },
      { status: 500 }
    )
  }
}
