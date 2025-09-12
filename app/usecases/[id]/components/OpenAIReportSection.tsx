'use client'

import React from 'react'
import { useOpenAIReport } from '../hooks/useOpenAIReport'

interface OpenAIReportSectionProps {
  usecaseId: string
}

export function OpenAIReportSection({ usecaseId }: OpenAIReportSectionProps) {
  const { report, loading, error } = useOpenAIReport(usecaseId)

  // Formatage du rapport pour l'affichage avec support Markdown
  const formatReport = (reportText: string) => {
    // Nettoyer le texte avant le traitement
    let cleanedText = reportText
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Nettoyer les retours à la ligne multiples
      .trim()

    // Traitement spécial pour ajouter des puces aux phrases d'action
    cleanedText = addBulletPointsToActionPhrases(cleanedText)

    // Diviser le texte en lignes pour traiter le Markdown
    const lines = cleanedText.split('\n')
    const elements: React.ReactElement[] = []
    let currentParagraph: string[] = []
    let listItems: string[] = []
    let inList = false
    let inCodeBlock = false

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim()
        if (paragraphText) {
          elements.push(
            <p key={elements.length} className="text-base leading-relaxed text-gray-800 mb-4">
              {formatInlineMarkdown(paragraphText)}
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
            {listItems.map((item, index) => (
              <li key={index} className="text-base leading-relaxed text-gray-800">
                {formatInlineMarkdown(item)}
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

  // Fonction pour ajouter des puces aux phrases d'action
  const addBulletPointsToActionPhrases = (text: string) => {
    // Détecter les sections avec des phrases d'action
    const actionSections = [
      '### Les 3 priorités d\'actions réglementaires',
      '### Quick wins & actions immédiates recommandées',
      '### Actions à moyen terme'
    ]

    let processedText = text

    actionSections.forEach(sectionTitle => {
      // Trouver la section
      const sectionRegex = new RegExp(`(${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?)(?=###|##|$)`, 'g')
      
      processedText = processedText.replace(sectionRegex, (match) => {
        // Diviser en lignes
        const lines = match.split('\n')
        const processedLines = lines.map(line => {
          // Détecter les phrases qui commencent par ** et se terminent par un point
          if (line.trim().match(/^\*\*.*\*\*\.\s*$/)) {
            // Ajouter une puce devant la phrase
            return `- ${line.trim()}`
          }
          // Détecter les paragraphes continus avec plusieurs phrases séparées par des points
          if (line.trim().includes('.') && line.trim().length > 50) {
            // Diviser par les points et reformater
            const sentences = line.trim().split(/\.\s+/).filter(s => s.trim().length > 0)
            if (sentences.length >= 3) {
              return sentences.map(sentence => {
                const trimmed = sentence.trim()
                if (trimmed.endsWith('.')) {
                  return `- ${trimmed}`
                } else {
                  return `- ${trimmed}.`
                }
              }).join('\n')
            }
          }
          return line
        })
        return processedLines.join('\n')
      })
    })

    return processedText
  }

  // Fonction pour formater le Markdown inline (gras, italique, etc.)
  const formatInlineMarkdown = (text: string) => {
    // Traiter le texte en gras **texte**
    const parts = text.split(/(\*\*.*?\*\*)/)
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return part
    })
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
