import type { PDFReportData } from './types'

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Source canonique unique pour la "Description" PDF.
 * Objectif: éviter tout fallback legacy (ex. Addeus / LinkedIn) et rester aligné avec le front.
 */
export function getPdfCanonicalDescription(data: PDFReportData): string {
  if (nonEmpty(data.useCase.description)) return data.useCase.description.trim()
  return "[Description du cas d'usage]"
}

/**
 * Aligne la "date du rapport" avec le front.
 * Priorité: last_calculation_date (si présent) > updated_at > generatedDate.
 */
export function getPdfReportDateIso(data: PDFReportData): string {
  const anyUseCase = data.useCase as any
  if (nonEmpty(anyUseCase?.last_calculation_date)) return anyUseCase.last_calculation_date.trim()
  if (nonEmpty(anyUseCase?.updated_at)) return anyUseCase.updated_at.trim()
  return data.generatedDate
}

