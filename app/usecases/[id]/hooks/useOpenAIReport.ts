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
  generateReport: () => Promise<void>
  regenerateReport: () => Promise<void>
  autoRegenerate: () => Promise<void>
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

  // Générer un nouveau rapport
  const generateReport = async () => {
    if (!usecaseId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usecase_id: usecaseId })
      })

      const data = await response.json()

      if (response.ok) {
        setReport({
          report: data.report,
          generated_at: data.timestamp,
          usecase_id: data.usecase_id,
          usecase_name: data.usecase_name,
          has_report: true
        })
      } else {
        // Si c'est une erreur de données insuffisantes, ne pas afficher d'erreur
        if (data.requires_questionnaire) {
          console.log('ℹ️ Questionnaire incomplet, rapport non généré')
          setError(null) // Pas d'erreur, juste pas de données
        } else {
          setError(data.error || 'Erreur lors de la génération du rapport')
        }
      }
    } catch (err) {
      setError('Erreur de connexion')
      console.error('Erreur generateReport:', err)
    } finally {
      setLoading(false)
    }
  }

  // Régénérer le rapport
  const regenerateReport = async () => {
    if (!usecaseId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/usecases/${usecaseId}/regenerate-report`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (response.ok) {
        setReport({
          report: data.report,
          generated_at: data.timestamp,
          usecase_id: data.usecase_id,
          usecase_name: data.usecase_name,
          has_report: true
        })
      } else {
        setError(data.error || 'Erreur lors de la régénération du rapport')
      }
    } catch (err) {
      setError('Erreur de connexion')
      console.error('Erreur regenerateReport:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fonction de régénération automatique (silencieuse)
  const autoRegenerate = async () => {
    if (!usecaseId) return

    try {
      const response = await fetch(`/api/usecases/${usecaseId}/regenerate-report`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (response.ok) {
        setReport({
          report: data.report,
          generated_at: data.timestamp,
          usecase_id: data.usecase_id,
          usecase_name: data.usecase_name,
          has_report: true
        })
      }
    } catch (err) {
      console.error('Erreur autoRegenerate:', err)
    }
  }

  // Charger le rapport au montage du composant
  useEffect(() => {
    fetchReport()
  }, [usecaseId])

  return {
    report,
    loading,
    error,
    generateReport,
    regenerateReport,
    autoRegenerate
  }
}
