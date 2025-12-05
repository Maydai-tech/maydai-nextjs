import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'

interface OpenAIReport {
  report: string
  generated_at: string
  usecase_id: string
  usecase_name: string
  has_report: boolean
}

interface UseOpenAIReportReturn {
  report: OpenAIReport | null
  loading: boolean
  error: string | null
}

export function useOpenAIReport(usecaseId: string): UseOpenAIReportReturn {
  const { session } = useAuth()
  const [report, setReport] = useState<OpenAIReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Récupérer le rapport existant
  const fetchReport = async () => {
    if (!usecaseId) return

    setLoading(true)
    setError(null)

    try {
      const headers: HeadersInit = {}
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch(`/api/generate-report?usecase_id=${usecaseId}`, { headers })
      const data = await response.json()

      if (response.ok) {
        setReport(data)
      } else if (response.status === 404) {
        // Pas de rapport existant, c'est normal
        setReport(null)
      } else {
        setError(data.error || 'Erreur lors de la récupération du rapport')
      }
    } catch (err) {
      setError('Erreur de connexion')
      console.error('Erreur fetchReport:', err)
    } finally {
      setLoading(false)
    }
  }


  // Charger le rapport au montage du composant ou quand la session change
  useEffect(() => {
    if (session?.access_token) {
      fetchReport()
    }
  }, [usecaseId, session?.access_token])

  return {
    report,
    loading,
    error
  }
}
