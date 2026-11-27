export type CompariaVisibilityStatus = 'unmatched' | 'ignored' | 'matched' | 'all'
export type CompariaVisibilityActivity = 'all' | 'active' | 'archived'

export interface CompariaVisibilityRow {
  link_status?: 'unmatched' | 'matched' | 'ignored' | null
  is_active?: boolean | null
  rank?: number | null
  source_id?: string | null
}

export function compariaQueueCounts(rows: readonly CompariaVisibilityRow[]): {
  unmatched: number
  ignored: number
  matched: number
} {
  return {
    unmatched: rows.filter((row) => row.link_status === 'unmatched').length,
    ignored: rows.filter((row) => row.link_status === 'ignored').length,
    matched: rows.filter((row) => row.link_status === 'matched').length,
  }
}

export function compariaRowVisible(
  row: CompariaVisibilityRow,
  status: CompariaVisibilityStatus,
  activity: CompariaVisibilityActivity = 'all',
): boolean {
  if (status !== 'all' && row.link_status !== status) return false
  if (activity === 'active') return row.is_active === true
  if (activity === 'archived') return row.is_active === false
  return true
}

export function sortCompariaQueue<T extends CompariaVisibilityRow>(rows: readonly T[]): T[] {
  return [...rows].sort((left, right) => {
    const leftActive = left.is_active === true ? 1 : 0
    const rightActive = right.is_active === true ? 1 : 0
    if (leftActive !== rightActive) return rightActive - leftActive
    const leftRank = typeof left.rank === 'number' ? left.rank : Number.POSITIVE_INFINITY
    const rightRank = typeof right.rank === 'number' ? right.rank : Number.POSITIVE_INFINITY
    if (leftRank !== rightRank) return leftRank - rightRank
    return (left.source_id ?? '').localeCompare(right.source_id ?? '', 'fr')
  })
}
