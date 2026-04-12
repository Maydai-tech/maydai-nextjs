/**
 * Export CSV léger pour le dashboard admin evaluation_path_runs.
 * Cohérent avec les mêmes filtres que l’API JSON (meta + tables principales).
 */

import type { SegmentConversionRow } from '@/lib/evaluation-path-short-to-long'

function esc(cell: string | number | null | undefined): string {
  const s = cell === null || cell === undefined ? '' : String(cell)
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function line(cells: (string | number | null | undefined)[]): string {
  return cells.map(esc).join(',')
}

type SegmentTable = SegmentConversionRow[]

function tableSection(title: string, columns: string[], rows: SegmentTable): string[] {
  const out: string[] = []
  out.push(`# ${title}`)
  out.push(line(columns))
  for (const r of rows) {
    out.push(
      line(
        columns.map((c) => {
          if (c === 'segment') return r.segment
          if (c === 'company_name') return r.company_name ?? ''
          if (c === 'cohort_count') return r.cohort_count
          if (c === 'long_started') return r.long_started
          if (c === 'long_completed') return r.long_completed
          if (c === 'rate_started') return r.rate_started ?? ''
          if (c === 'rate_completed') return r.rate_completed ?? ''
          if (c === 'median_seconds_to_long_start') return r.median_seconds_to_long_start ?? ''
          return ''
        })
      )
    )
  }
  out.push('')
  return out
}

/** Payload minimal attendu depuis l’API admin (même forme que NextResponse.json). */
export type EvaluationPathRunsAdminCsvInput = {
  meta: {
    from: string
    to: string
    start_utc: string
    end_utc: string
    questionnaire_version: number | null
  }
  short: Record<string, number | null>
  long: Record<string, number | null>
  short_to_long: {
    summary: Record<string, number | null>
    summary_windows: Record<string, number | null>
    by_entry_surface: SegmentTable
    by_system_type: SegmentTable
    by_classification_status: SegmentTable
    by_risk_level: SegmentTable
    by_questionnaire_version: SegmentTable
    by_company_id: SegmentTable
  }
  by_entry_surface: { entry_surface: string; short_starts: number; long_starts: number }[]
  by_outcome: { classification_status: string; risk_level: string; count: number }[]
}

export function evaluationPathRunsAdminToCsv(data: EvaluationPathRunsAdminCsvInput): string {
  const lines: string[] = []
  lines.push('\uFEFF')
  lines.push('# evaluation_path_runs — export admin')
  lines.push('# Filtres')
  lines.push(line(['meta_key', 'meta_value']))
  lines.push(line(['from', data.meta.from]))
  lines.push(line(['to', data.meta.to]))
  lines.push(line(['start_utc', data.meta.start_utc]))
  lines.push(line(['end_utc', data.meta.end_utc]))
  lines.push(
    line([
      'questionnaire_version',
      data.meta.questionnaire_version === null ? '' : data.meta.questionnaire_version,
    ])
  )
  lines.push('')

  lines.push('# Parcours court / long (volumes période)')
  lines.push(line(['metric', 'short', 'long']))
  lines.push(line(['starts', data.short.starts, data.long.starts]))
  lines.push(line(['completions', data.short.completions, data.long.completions]))
  lines.push(line(['completion_rate', data.short.completion_rate ?? '', data.long.completion_rate ?? '']))
  lines.push('')

  lines.push('# Conversion court → long — résumé')
  lines.push(line(['metric', 'value']))
  for (const [k, v] of Object.entries(data.short_to_long.summary)) {
    lines.push(line([k, v === null ? '' : v]))
  }
  lines.push('')

  lines.push('# Conversion — fenêtres (taux vs cohorte)')
  lines.push(line(['metric', 'value']))
  for (const [k, v] of Object.entries(data.short_to_long.summary_windows)) {
    lines.push(line([k, v === null ? '' : v]))
  }
  lines.push('')

  const segCols = [
    'segment',
    'company_name',
    'cohort_count',
    'long_started',
    'long_completed',
    'rate_started',
    'rate_completed',
    'median_seconds_to_long_start',
  ]

  lines.push(
    ...tableSection('Conversion par surface', segCols, data.short_to_long.by_entry_surface)
  )
  lines.push(...tableSection('Conversion par system_type', segCols, data.short_to_long.by_system_type))
  lines.push(
    ...tableSection(
      'Conversion par classification',
      segCols,
      data.short_to_long.by_classification_status
    )
  )
  lines.push(...tableSection('Conversion par risk_level', segCols, data.short_to_long.by_risk_level))
  lines.push(
    ...tableSection(
      'Conversion par questionnaire_version',
      segCols,
      data.short_to_long.by_questionnaire_version
    )
  )
  lines.push(...tableSection('Conversion par entreprise', segCols, data.short_to_long.by_company_id))

  lines.push('# Démarrages par surface (court / long)')
  lines.push(line(['entry_surface', 'short_starts', 'long_starts']))
  for (const r of data.by_entry_surface) {
    lines.push(line([r.entry_surface, r.short_starts, r.long_starts]))
  }
  lines.push('')

  lines.push('# Complétions par résultat')
  lines.push(line(['classification_status', 'risk_level', 'count']))
  for (const r of data.by_outcome) {
    lines.push(line([r.classification_status, r.risk_level, r.count]))
  }

  return lines.join('\r\n')
}
