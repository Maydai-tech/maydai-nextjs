'use client'

import React from 'react'
import { useOpenAIReport } from '../hooks/useOpenAIReport'

interface OpenAIReportSectionProps {
  usecaseId: string
}

export function OpenAIReportSectionJSON({ usecaseId }: OpenAIReportSectionProps) {
  const { report, loading, error } = useOpenAIReport(usecaseId)

  // Formatage du rapport pour l'affichage avec support JSON et Markdown
  const formatReport = (reportText: string) => {
    try {
      // Parser le JSON
      const reportData = JSON.parse(reportText)
      
      return (
        <div className="space-y-6">
          {/* Introduction contextuelle */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Introduction contextuelle</h2>
            <p className="text-base leading-relaxed text-gray-800">{reportData.introduction_contextuelle}</p>
          </div>

          {/* Évaluation du risque */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Évaluation du niveau de risque AI Act</h2>
            <p className="text-base leading-relaxed text-gray-800 mb-2">
              <strong>Niveau de risque :</strong> {reportData.evaluation_risque.niveau}
            </p>
            <p className="text-base leading-relaxed text-gray-800">{reportData.evaluation_risque.justification}</p>
          </div>

          {/* Priorités d'actions */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Il est impératif de mettre en œuvre les mesures suivantes :</h2>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Les 3 priorités d'actions réglementaires</h3>
            <ul className="space-y-2 mb-4 ml-4">
              {reportData.priorites_actions.map((action: string, index: number) => (
                <li key={index} className="text-base leading-relaxed text-gray-800">
                  {action}
                </li>
              ))}
            </ul>
          </div>

          {/* Quick wins */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Trois actions concrètes à mettre en œuvre rapidement :</h2>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Quick wins & actions immédiates recommandées</h3>
            <ul className="space-y-2 mb-4 ml-4">
              {reportData.quick_wins.map((action: string, index: number) => (
                <li key={index} className="text-base leading-relaxed text-gray-800">
                  {action}
                </li>
              ))}
            </ul>
          </div>

          {/* Impact attendu */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Impact attendu</h2>
            <p className="text-base leading-relaxed text-gray-800">{reportData.impact_attendu}</p>
          </div>

          {/* Actions moyen terme */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Trois actions structurantes à mener dans les 3 à 6 mois :</h2>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Actions à moyen terme</h3>
            <ul className="space-y-2 mb-4 ml-4">
              {reportData.actions_moyen_terme.map((action: string, index: number) => (
                <li key={index} className="text-base leading-relaxed text-gray-800">
                  {action}
                </li>
              ))}
            </ul>
          </div>

          {/* Conclusion */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Conclusion</h2>
            <p className="text-base leading-relaxed text-gray-800">{reportData.conclusion}</p>
          </div>
        </div>
      )
    } catch (error) {
      // Fallback : traiter comme du Markdown et transformer les phrases en puces
      console.log('Format Markdown détecté, transformation en cours...')
      
      // Transformer les sections avec phrases en listes à puces
      let processedText = reportText
      
      // Détecter et transformer les sections d'actions
      const sections = [
        '### Les 3 priorités d\'actions réglementaires',
        '### Quick wins & actions immédiates recommandées', 
        '### Actions à moyen terme'
      ]
      
      sections.forEach(sectionTitle => {
        const sectionRegex = new RegExp(
          `(${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*\\n\\s*\\n([\\s\\S]*?)(?=\\n##|\\n###|$)`,
          'g'
        )
        
        processedText = processedText.replace(sectionRegex, (match, title, content) => {
          // Diviser le contenu en phrases (séparées par des points suivis d'un espace et d'une majuscule)
          const sentences = content.trim().split(/\.\s+(?=[A-Z])/).filter((s: string) => s.trim())
          
          if (sentences.length > 0) {
            // Transformer en liste à puces
            const bulletPoints = sentences.map((sentence: string) => {
              const trimmed = sentence.trim()
              return trimmed.endsWith('.') ? trimmed : trimmed + '.'
            }).map((sentence: string) => `- ${sentence}`).join('\n')
            
            return `${title}\n\n${bulletPoints}\n\n`
          }
          
          return match
        })
      })
      
      // Traitement Markdown basique
      const lines = processedText.split('\n')
      const elements: React.ReactElement[] = []
      let currentParagraph: string[] = []
      let listItems: string[] = []
      let inList = false

      const flushParagraph = () => {
        if (currentParagraph.length > 0) {
          const paragraphText = currentParagraph.join(' ').trim()
          if (paragraphText) {
            elements.push(
              <p key={elements.length} className="text-base leading-relaxed text-gray-800 mb-4">
                {paragraphText}
              </p>
            )
          }
          currentParagraph = []
        }
      }

      const flushList = () => {
        if (listItems.length > 0) {
          elements.push(
            <ul key={elements.length} className="space-y-2 mb-4 ml-4">
              {listItems.map((item: string, index: number) => (
                <li key={index} className="text-base leading-relaxed text-gray-800">
                  {item}
                </li>
              ))}
            </ul>
          )
          listItems = []
          inList = false
        }
      }

      lines.forEach((line, index) => {
        const trimmedLine = line.trim()
        
        if (!trimmedLine) {
          flushParagraph()
          flushList()
          return
        }

        // Détecter les titres Markdown
        if (trimmedLine.startsWith('# ')) {
          flushParagraph()
          flushList()
          elements.push(
            <h1 key={elements.length} className="text-2xl font-bold text-gray-900 mb-6 mt-8 first:mt-0">
              {trimmedLine.slice(2)}
            </h1>
          )
        } else if (trimmedLine.startsWith('## ')) {
          flushParagraph()
          flushList()
          elements.push(
            <h2 key={elements.length} className="text-xl font-semibold text-gray-900 mb-4 mt-6">
              {trimmedLine.slice(3)}
            </h2>
          )
        } else if (trimmedLine.startsWith('### ')) {
          flushParagraph()
          flushList()
          elements.push(
            <h3 key={elements.length} className="text-lg font-medium text-gray-700 mb-3 mt-4">
              {trimmedLine.slice(4)}
            </h3>
          )
        } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          flushParagraph()
          if (!inList) {
            inList = true
          }
          listItems.push(trimmedLine.slice(2))
        } else {
          // Paragraphe normal
          if (inList) {
            flushList()
          }
          currentParagraph.push(trimmedLine)
        }
      })

      // Flush les éléments restants
      flushParagraph()
      flushList()

      return elements
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Analyse de Conformité IA Act - Section 3
        </h2>
        {loading && (
          <p className="text-sm text-gray-600 mt-2">
            Chargement du rapport...
          </p>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Erreur</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading && !report && (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-[#0080a3] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du rapport...</p>
        </div>
      )}

      {!report && !loading && !error && (
        <div className="text-center py-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <svg className="w-12 h-12 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-blue-900 mb-2">Aucun rapport disponible</h3>
            <p className="text-blue-700">
              Le rapport d'analyse IA Act sera généré automatiquement une fois le questionnaire d'évaluation complété.
            </p>
          </div>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* En-tête du rapport */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Rapport généré le {new Date(report.generated_at).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Généré par IA
              </span>
            </div>
          </div>

          {/* Contenu du rapport */}
          <div className="prose prose-gray max-w-none">
            {formatReport(report.report)}
          </div>
        </div>
      )}
    </div>
  )
}
