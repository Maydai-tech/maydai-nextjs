import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'

type RiskLevel = 'unacceptable' | 'high' | 'limited' | 'minimal'

interface UseRiskLevelReturn {
  riskLevel: RiskLevel | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useRiskLevel(useCaseId: string): UseRiskLevelReturn {
  const { session } = useAuth()
  const [riskLevel, setRiskLevel] = useState<RiskLevel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRiskLevel = useCallback(async () => {
    if (!session?.access_token || !useCaseId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/use-cases/${useCaseId}/risk-level`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Use case not found')
        }
        throw new Error('Failed to fetch risk level')
      }

      const data = await response.json()
      setRiskLevel(data.risk_level)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading risk level')
      setRiskLevel(null)
    } finally {
      setLoading(false)
    }
  }, [session?.access_token, useCaseId])

  useEffect(() => {
    fetchRiskLevel()
  }, [fetchRiskLevel])

  return {
    riskLevel,
    loading,
    error,
    refetch: fetchRiskLevel
  }
}