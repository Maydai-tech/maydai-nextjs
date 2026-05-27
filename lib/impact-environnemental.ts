import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Libellé affiché lorsqu'un modèle texte-only est comparé au cas Vision. */
export const INCOMPATIBLE_TEXT_ONLY_LABEL = 'N/A - Modèle Texte Uniquement'

/** Modèle avec métriques EcoLogits normalisées pour 1000 tokens (région FRA). */
export interface EcoImpactModel {
  id: string
  modelName: string
  modelProvider: string | null
  /** Valeur `compl_ai_models.is_multimodal` (capacité Vision : image en entrée). */
  isMultimodal: boolean
  /** Énergie totale pour 1000 tokens, en Wh. */
  energyWhPer1kTokens: number
  /** ADPe total pour 1000 tokens, en kg Sb eq. */
  adpePer1kTokens: number
}

export type UseCaseId =
  | 'email'
  | 'article'
  | 'synthese'
  | 'vision'

export interface UseCaseDefinition {
  id: UseCaseId
  label: string
  /** Indication pédagogique du volume de tokens (affichage UI). */
  tokenHint: string
  /** Multiplicateur appliqué au score de base (1000 tokens). */
  tokenMultiplier: number
}

export const USE_CASE_DEFINITIONS: UseCaseDefinition[] = [
  {
    id: 'email',
    label: 'Email / Petit paragraphe',
    /** 1 000 tokens (base EcoLogits) × 0,5 */
    tokenHint: '~500 tokens',
    tokenMultiplier: 0.5,
  },
  {
    id: 'article',
    label: 'Article standard',
    /** 1 000 tokens (base EcoLogits) × 2 */
    tokenHint: '~2 000 tokens',
    tokenMultiplier: 2,
  },
  {
    id: 'synthese',
    label: 'Synthèse document (4 pages)',
    /** 1 000 tokens (base EcoLogits) × 4 */
    tokenHint: '~4 000 tokens',
    tokenMultiplier: 4,
  },
  {
    id: 'vision',
    label: 'Analyser une image complexe (Vision)',
    /** 1 000 tokens (base EcoLogits) × 1,5 */
    tokenHint: '~1 500 tokens',
    tokenMultiplier: 1.5,
  },
]

/** Noms de modèles par défaut pour la comparaison sur la page impact environnemental. */
export const DEFAULT_IMPACT_MODEL_A_NAME = 'gpt-4'
export const DEFAULT_IMPACT_MODEL_B_NAME = 'claude-opus-4'

export interface ComputedImpact {
  energyWh: number
  adpe: number
}

export type ImpactComputeStatus = 'ok' | 'incompatible_multimodal'

export interface ComputedImpactResult extends ComputedImpact {
  status: ImpactComputeStatus
}

export interface EquivalenceMetrics {
  smartphoneRecharges: number
  ledMinutes: number
  netflixMinutes: number
}

function getServiceRoleClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Variables d\'environnement Supabase manquantes')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

type EcoRow = {
  model_id: string
  energy_total_mean: number | string | null
  adpe_total_mean: number | string | null
  compl_ai_models:
    | { id: string; model_name: string; model_provider: string | null; is_multimodal: boolean | null }
    | { id: string; model_name: string; model_provider: string | null; is_multimodal: boolean | null }[]
    | null
}

/**
 * Récupère les modèles avec agrégats EcoLogits pour la France (FRA).
 * Jointure `eco_evaluations_aggregated` → `compl_ai_models`.
 */
export async function fetchEcoImpactModelsFra(): Promise<EcoImpactModel[]> {
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase
    .from('eco_evaluations_aggregated')
    .select(
      `
      model_id,
      energy_total_mean,
      adpe_total_mean,
      compl_ai_models!inner (
        id,
        model_name,
        model_provider,
        is_multimodal
      )
    `
    )
    .eq('region_code', 'FRA')
    .eq('mode', 'simulated')
    .not('energy_total_mean', 'is', null)
    .not('adpe_total_mean', 'is', null)

  if (error) {
    throw new Error(`Erreur Supabase eco_evaluations_aggregated: ${error.message}`)
  }

  const byModelId = new Map<string, EcoImpactModel>()

  for (const row of (data ?? []) as EcoRow[]) {
    const energyMean = toNumber(row.energy_total_mean)
    const adpeMean = toNumber(row.adpe_total_mean)
    if (energyMean == null || adpeMean == null) continue

    const joined = Array.isArray(row.compl_ai_models)
      ? row.compl_ai_models[0]
      : row.compl_ai_models
    if (!joined?.model_name) continue

    const model: EcoImpactModel = {
      id: row.model_id,
      modelName: joined.model_name,
      modelProvider: joined.model_provider ?? null,
      isMultimodal: joined.is_multimodal === true,
      energyWhPer1kTokens: energyMean * 1000,
      adpePer1kTokens: adpeMean,
    }

    if (!byModelId.has(model.id)) {
      byModelId.set(model.id, model)
    }
  }

  return [...byModelId.values()].sort((a, b) =>
    a.modelName.localeCompare(b.modelName, 'fr')
  )
}

export function getUseCaseById(id: UseCaseId): UseCaseDefinition {
  const found = USE_CASE_DEFINITIONS.find((u) => u.id === id)
  if (!found) {
    throw new Error(`Cas d'usage inconnu: ${id}`)
  }
  return found
}

/** Cas d'usage nécessitant la capacité Vision (image en entrée). */
export function isVisionUseCase(useCaseId: UseCaseId): boolean {
  return useCaseId === 'vision'
}

/** Capacités multimédia déduites de `compl_ai_models.is_multimodal`. */
export function modelSupportsMultimodalMedia(
  model: Pick<EcoImpactModel, 'isMultimodal'>
): boolean {
  return model.isMultimodal === true
}

export function isModelIncompatibleWithUseCase(
  model: Pick<EcoImpactModel, 'isMultimodal'>,
  useCaseId: UseCaseId
): boolean {
  if (!isVisionUseCase(useCaseId)) return false
  return !modelSupportsMultimodalMedia(model)
}

/** Applique le multiplicateur de tokens au score de base (1000 tokens). */
export function computeImpactForModel(
  model: Pick<EcoImpactModel, 'energyWhPer1kTokens' | 'adpePer1kTokens'>,
  useCase: Pick<UseCaseDefinition, 'tokenMultiplier'>
): ComputedImpact {
  return {
    energyWh: model.energyWhPer1kTokens * useCase.tokenMultiplier,
    adpe: model.adpePer1kTokens * useCase.tokenMultiplier,
  }
}

/**
 * Calcule l'impact ; le cas Vision sur un modèle texte-only renvoie status incompatible (valeurs nulles).
 */
export function computeImpactForModelWithCompatibility(
  model: EcoImpactModel,
  useCase: UseCaseDefinition
): ComputedImpactResult {
  if (isModelIncompatibleWithUseCase(model, useCase.id)) {
    return {
      status: 'incompatible_multimodal',
      energyWh: 0,
      adpe: 0,
    }
  }

  const impact = computeImpactForModel(model, useCase)
  return {
    status: 'ok',
    ...impact,
  }
}

/** Équivalences vie quotidienne à partir de l'énergie totale (Wh). */
export function computeEquivalenceMetrics(totalWh: number): EquivalenceMetrics {
  const safeWh = Math.max(0, totalWh)
  return {
    smartphoneRecharges: safeWh / 12,
    ledMinutes: (safeWh / 9) * 60,
    netflixMinutes: (safeWh / 100) * 60,
  }
}

/** Équivalences basées sur l'énergie économisée (A − B, plafonnée à 0). */
export function computeSavingsEquivalences(energyWhA: number, energyWhB: number): EquivalenceMetrics {
  return computeEquivalenceMetrics(Math.max(0, energyWhA - energyWhB))
}

export interface RelativeBarMetrics {
  /** Largeur de la barre B en % par rapport à A (référence = 100 %). */
  barBWidthPercent: number
  /** Pourcentage de réduction si B &lt; A. */
  reductionPercent: number | null
}

/** Barre A = référence 100 % ; barre B = (valeurB / valeurA) × 100, min 2 % pour visibilité. */
export function computeRelativeBarMetrics(
  referenceValue: number,
  comparisonValue: number
): RelativeBarMetrics {
  if (referenceValue <= 0) {
    const barBWidthPercent = comparisonValue > 0 ? 100 : 2
    return { barBWidthPercent: Math.max(barBWidthPercent, 2), reductionPercent: null }
  }

  const ratio = (comparisonValue / referenceValue) * 100
  const barBWidthPercent = Math.max(ratio, 2)
  const reductionPercent =
    comparisonValue < referenceValue
      ? ((referenceValue - comparisonValue) / referenceValue) * 100
      : null

  return { barBWidthPercent, reductionPercent }
}

/** Facteur kg Sb eq → ng Sb eq (×10⁹) pour affichage et graphiques Recharts. */
export const ADPE_KG_TO_NG = 1e9

/** Convertit une valeur ADPe stockée en kg Sb eq vers des nanogrammes Sb eq. */
export function adpeKgToNanograms(kgSbEq: number): number {
  return kgSbEq * ADPE_KG_TO_NG
}

export function formatImpactNumber(value: number, maxDecimals = 6): string {
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  if (value >= 100) return value.toFixed(1)
  if (value >= 1) return value.toFixed(2)
  return value.toPrecision(3)
}

/** Formate une valeur ADPe (kg Sb eq) en nanogrammes pour l'affichage. */
export function formatAdpeNanograms(kgSbEq: number): string {
  return formatImpactNumber(adpeKgToNanograms(kgSbEq))
}
