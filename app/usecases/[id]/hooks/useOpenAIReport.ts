import { useState, useEffect } from 'react'

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
  const [report, setReport] = useState<OpenAIReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Récupérer le rapport existant
  const fetchReport = async () => {
    if (!usecaseId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/generate-report?usecase_id=${usecaseId}`)
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


  // Charger le rapport au montage du composant
  useEffect(() => {
    fetchReport()
  }, [usecaseId])

  return {
    report,
    loading,
    error
  }
}
