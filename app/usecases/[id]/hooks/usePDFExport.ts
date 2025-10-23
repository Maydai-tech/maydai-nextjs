import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'

interface UsePDFExportReturn {
  isGenerating: boolean
  error: string | null
  generatePDF: () => Promise<void>
}

export function usePDFExport(useCaseId: string): UsePDFExportReturn {
  const { session } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    try {
      const response = await fetch(`/api/usecases/${useCaseId}/generate-pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`)
      }

      // Vérifier que la réponse est bien un PDF
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/pdf')) {
        throw new Error('La réponse n\'est pas un fichier PDF valide')
      }

      // Récupérer le nom du fichier depuis les headers
      const contentDisposition = response.headers.get('content-disposition')
      let filename = 'rapport-audit.pdf'
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Convertir la réponse en blob
      const blob = await response.blob()
      
      // Créer un URL temporaire pour le téléchargement
      const url = window.URL.createObjectURL(blob)
      
      // Créer un élément de lien temporaire pour déclencher le téléchargement
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.style.display = 'none'
      
      // Ajouter au DOM, cliquer, puis supprimer
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Nettoyer l'URL temporaire
      window.URL.revokeObjectURL(url)

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
    generatePDF
  }
}







