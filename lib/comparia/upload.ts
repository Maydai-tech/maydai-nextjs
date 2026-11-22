import { NextRequest } from 'next/server'

export const COMPARIA_MAX_FILE_SIZE = 5 * 1024 * 1024

export type CompariaUpload =
  | { ok: true; fileName: string; csv: string }
  | { ok: false; error: string; status: number }

export async function readCompariaCsvUpload(request: NextRequest): Promise<CompariaUpload> {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return { ok: false, error: 'Envoi de fichier invalide.', status: 400 }
  }
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { ok: false, error: 'Fichier CSV Compar:IA manquant.', status: 400 }
  }
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return { ok: false, error: 'Le fichier doit être au format CSV.', status: 400 }
  }
  if (file.size > COMPARIA_MAX_FILE_SIZE) {
    return { ok: false, error: 'Le fichier CSV dépasse la limite de 5 Mo.', status: 413 }
  }
  return { ok: true, fileName: file.name, csv: await file.text() }
}
