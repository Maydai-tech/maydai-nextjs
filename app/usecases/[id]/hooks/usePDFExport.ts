import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth'

interface UsePDFExportReturn {
  isGenerating: boolean
  error: string | null
  /** Message court après téléchargement lancé (disparaît après quelques secondes). */
  successMessage: string | null
  generatePDF: () => Promise<void>
}

const SUCCESS_CLEAR_MS = 6000

export function usePDFExport(useCaseId: string): UsePDFExportReturn {
  const { session } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current)
      }
    }
  }, [])

  const generatePDF = useCallback(async () => {
    if (!session?.access_token) {
      setError('Non authentifié')
      return
    }

    if (!useCaseId) {
      setError('ID du cas d\'usage manquant')
      return
    }

    setIsGenerating(true)
    setError(null)
    setSuccessMessage(null)
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current)
      successTimerRef.current = null
    }

    try {
      const response = await fetch(`/api/usecases/${useCaseId}/generate-pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        let message = `Erreur ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          if (errorData?.error && typeof errorData.error === 'string') {
            message = errorData.error
          }
        } catch {
          /* ignore */
        }
        throw new Error(message)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/pdf')) {
        throw new Error('La réponse n\'est pas un fichier PDF valide')
      }

      const contentDisposition = response.headers.get('content-disposition')
      let filename = 'rapport-audit.pdf'

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.style.display = 'none'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      window.URL.revokeObjectURL(url)

      setSuccessMessage('Téléchargement du PDF lancé. Vérifiez votre dossier de téléchargements.')
      successTimerRef.current = setTimeout(() => {
        setSuccessMessage(null)
        successTimerRef.current = null
      }, SUCCESS_CLEAR_MS)
    } catch (err) {
      console.error('Erreur lors de la génération du PDF:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue lors de la génération du PDF')
    } finally {
      setIsGenerating(false)
    }
  }, [session?.access_token, useCaseId])

  return {
    isGenerating,
    error,
    successMessage,
    generatePDF
  }
}
