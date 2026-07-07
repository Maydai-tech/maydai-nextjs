import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import type { UseCase } from '../types/usecase'

type RiskLevel = 'unacceptable' | 'high' | 'limited' | 'minimal'

/** V3 : pivots « Je ne sais pas » — pas de niveau fiable dans risk_level. */
export type ClassificationStatus = 'qualified' | 'impossible'

export interface UseRiskLevelReturn {
  riskLevel: RiskLevel | null
  classificationStatus: ClassificationStatus | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function parseRiskPayload(data: {
  risk_level?: string | null
  classification_status?: string | null
}): { riskLevel: RiskLevel | null; classificationStatus: ClassificationStatus } {
  const classificationStatus: ClassificationStatus =
    data.classification_status === 'impossible' ? 'impossible' : 'qualified'

  const raw = data.risk_level
  if (raw == null || typeof raw !== 'string') {
    return { riskLevel: null, classificationStatus }
  }
  if (
    raw === 'unacceptable' ||
    raw === 'high' ||
    raw === 'limited' ||
    raw === 'minimal'
  ) {
    return { riskLevel: raw, classificationStatus }
  }
  return { riskLevel: null, classificationStatus }
}

/** Aligné sur les colonnes DB du use case (affichage d’attente / repli si l’API échoue). */
export function parseRiskFieldsFromUseCase(
  useCase: Pick<UseCase, 'risk_level' | 'classification_status'> | null | undefined
): { riskLevel: RiskLevel | null; classificationStatus: ClassificationStatus } | null {
  if (!useCase) return null
  return parseRiskPayload({
    risk_level: useCase.risk_level ?? null,
    classification_status: useCase.classification_status ?? null,
  })
}

/** Priorité API une fois réponse OK ; sinon snapshot use case ; erreur seulement sans snapshot. */
export function mergeRiskDisplay(
  snapshot: { riskLevel: RiskLevel | null; classificationStatus: ClassificationStatus } | null,
  apiSettled: boolean,
  apiError: string | null,
  apiRisk: RiskLevel | null,
  apiClassification: ClassificationStatus | null
): {
  riskLevel: RiskLevel | null
  classificationStatus: ClassificationStatus | null
  error: string | null
} {
  if (apiSettled && !apiError) {
    return {
      riskLevel: apiRisk,
      classificationStatus: apiClassification,
      error: null,
    }
  }
  return {
    riskLevel: snapshot?.riskLevel ?? apiRisk ?? null,
    classificationStatus: snapshot?.classificationStatus ?? apiClassification ?? null,
    error: apiError && !snapshot ? apiError : null,
  }
}

/**
 * Source de vérité UI : réponse `/api/use-cases/[id]/risk-level` (calcul réponses) ;
 * en attente ou en erreur : valeurs issues du use case chargé avec la page (pas de mélange header / sidebar).
 */
export function useRiskLevel(
  useCaseId: string,
  useCase?: Pick<UseCase, 'id' | 'risk_level' | 'classification_status' | 'updated_at'> | null
): UseRiskLevelReturn {
  const { session } = useAuth()
  const [apiRiskLevel, setApiRiskLevel] = useState<RiskLevel | null>(null)
  const [apiClassification, setApiClassification] = useState<ClassificationStatus | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [apiSettled, setApiSettled] = useState(false)

  const snapshot = useMemo(() => {
    if (!useCase || useCase.id !== useCaseId) return null
    return parseRiskFieldsFromUseCase(useCase)
  }, [useCase, useCaseId])

  const fetchRiskLevel = useCallback(async () => {
    if (!session?.access_token || !useCaseId || useCaseId === '') {
      setApiSettled(true)
      return
    }

    try {
      setApiSettled(false)
      setApiError(null)

      const response = await fetch(`/api/use-cases/${useCaseId}/risk-level`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Use case not found')
        }
        throw new Error('Failed to fetch risk level')
      }

      const data = await response.json()
      const parsed = parseRiskPayload(data)
      setApiRiskLevel(parsed.riskLevel)
      setApiClassification(parsed.classificationStatus)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error loading risk level')
      setApiRiskLevel(null)
      setApiClassification(null)
    } finally {
      setApiSettled(true)
    }
  }, [session?.access_token, useCaseId])

  useEffect(() => {
    fetchRiskLevel()
  }, [fetchRiskLevel, useCase?.updated_at])

  const merged = useMemo(
    () => mergeRiskDisplay(snapshot, apiSettled, apiError, apiRiskLevel, apiClassification),
    [snapshot, apiSettled, apiError, apiRiskLevel, apiClassification]
  )

  const loading = Boolean(
    session?.access_token &&
      useCaseId &&
      !snapshot &&
      !apiSettled
  )

  return {
    riskLevel: merged.riskLevel,
    classificationStatus: merged.classificationStatus,
    loading,
    error: merged.error,
    refetch: fetchRiskLevel,
  }
}
