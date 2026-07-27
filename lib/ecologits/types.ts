export const ECOLOGITS_OUTPUT_TOKENS = 1000
export const ECOLOGITS_ELECTRICITY_ZONE = 'FRA'

export type EcoLogitsWarning = {
  code?: string
  message?: string
}

export type EcoLogitsCatalogModel = {
  provider: string
  name: string
  architecture?: unknown
  sources?: unknown[]
  warnings?: EcoLogitsWarning[]
  [key: string]: unknown
}

export type EcoLogitsImpact = {
  value?: {
    min?: number
    max?: number
  }
  unit?: string
}

export type EcoLogitsEstimationResponse = {
  impacts?: {
    energy?: EcoLogitsImpact
    gwp?: EcoLogitsImpact
    adpe?: EcoLogitsImpact
    pe?: EcoLogitsImpact
    wcf?: EcoLogitsImpact
    warnings?: EcoLogitsWarning[]
  }
  [key: string]: unknown
}

export type EcoLogitsSyncResult = {
  success: boolean
  status: 'success' | 'partial' | 'error'
  runId: string
  providersFetched: number
  modelsFetched: number
  modelsUpserted: number
  modelsDeactivated: number
  estimatesSucceeded: number
  estimatesFailed: number
  exactLinksCreated: number
  errors: string[]
  durationMs: number
}
