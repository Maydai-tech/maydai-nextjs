type FilterableEcoModel = {
  provider: string
  name: string
  is_active: boolean
  warnings: unknown
  link: unknown
}

export type EcoLogitsAdminFilters = {
  search: string
  provider: string
  linked: 'all' | 'linked' | 'unlinked'
  active: 'all' | 'active' | 'inactive'
  warning: boolean
}

export function hasEcoLogitsLink(link: unknown): boolean {
  return Array.isArray(link) ? link.length > 0 : Boolean(link)
}

export function filterEcoLogitsModels<T extends FilterableEcoModel>(
  models: T[],
  filters: EcoLogitsAdminFilters,
): T[] {
  const search = filters.search.trim().toLowerCase()
  return models.filter((model) => {
    const hasLink = hasEcoLogitsLink(model.link)
    const warnings = Array.isArray(model.warnings) ? model.warnings : []
    if (filters.provider && model.provider !== filters.provider) return false
    if (filters.active === 'active' && !model.is_active) return false
    if (filters.active === 'inactive' && model.is_active) return false
    if (filters.linked === 'linked' && !hasLink) return false
    if (filters.linked === 'unlinked' && hasLink) return false
    if (filters.warning && warnings.length === 0) return false
    if (search && !`${model.provider} ${model.name}`.toLowerCase().includes(search)) return false
    return true
  })
}

export function paginateEcoLogitsModels<T>(models: T[], page: number, pageSize: number): T[] {
  const from = (page - 1) * pageSize
  return models.slice(from, from + pageSize)
}
