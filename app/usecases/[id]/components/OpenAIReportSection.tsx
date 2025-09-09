'use client'

import { useOpenAIReport } from '../hooks/useOpenAIReport'

interface OpenAIReportSectionProps {
  usecaseId: string
}

export function OpenAIReportSection({ usecaseId }: OpenAIReportSectionProps) {
  const { report, loading, error } = useOpenAIReport(usecaseId)

  // Formatage du rapport pour l'affichage
  const formatReport = (reportText: string) => {
    // Nettoyer le texte avant le traitement
    let cleanedText = reportText
      // Supprimer les tirets isolés en fin de ligne
      .replace(/^\s*-\s*$/gm, '')
      // Supprimer les points isolés en début de ligne
      .replace(/^\s*\.\s*/gm, '')
      // Nettoyer les espaces multiples
      .replace(/\s+/g, ' ')
      // Nettoyer les retours à la ligne multiples
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim()

    // Diviser le rapport en sections
    const sections = cleanedText.split(/\*\*(.*?)\*\*/g)
    
    return sections.map((section, index) => {
      if (index % 2 === 1) {
        // C'est un titre (entre **)
        return (
          <h3 key={index} className="text-lg font-semibold text-gray-900 mb-4 mt-6 first:mt-0">
            {section.trim()}
          </h3>
        )
      } else {
        // C'est du contenu
        const content = section.trim()
        if (!content) return null

        // Diviser en paragraphes
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim())
        
        return (
          <div key={index} className="space-y-4">
            {paragraphs.map((paragraph, pIndex) => {
              const trimmedParagraph = paragraph.trim()
              if (!trimmedParagraph) return null

              // Détecter si c'est une liste (commence par un tiret ou contient des éléments de liste)
              const lines = trimmedParagraph.split('\n').map(line => line.trim()).filter(line => line)
              const isList = lines.some(line => 
                line.startsWith('-') || 
                line.startsWith('•') || 
                line.match(/^\d+\./) ||
                line.startsWith('*')
              )

              if (isList) {
                // Traiter comme une liste
                return (
                  <ul key={pIndex} className="space-y-3">
                    {lines.map((line, lineIndex) => {
                      // Nettoyer la ligne de liste
                      const cleanLine = line.replace(/^[-•*]\s*/, '').trim()
                      if (!cleanLine) return null

                      // Détecter si c'est un sous-élément (indenté)
                      const isSubItem = line.startsWith('  ') || line.startsWith('\t')
                      
                      // Détecter si la ligne contient du texte en gras
                      const hasBoldText = cleanLine.includes('**')
                      const parts = hasBoldText ? cleanLine.split(/(\*\*.*?\*\*)/) : [cleanLine]

                      return (
                        <li key={lineIndex} className={`${isSubItem ? 'ml-6' : 'ml-4'} text-base leading-relaxed text-gray-800`}>
                          {hasBoldText ? (
                            <span>
                              {parts.map((part, partIndex) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return (
                                    <strong key={partIndex} className="font-semibold">
                                      {part.slice(2, -2)}
                                    </strong>
                                  )
                                }
                                return part
                              })}
                            </span>
                          ) : (
                            cleanLine
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )
              } else {
                // Traiter comme un paragraphe normal
                // Détecter si le paragraphe contient du texte en gras
                const hasBoldText = trimmedParagraph.includes('**')
                const parts = hasBoldText ? trimmedParagraph.split(/(\*\*.*?\*\*)/) : [trimmedParagraph]

                return (
                  <p key={pIndex} className="text-base leading-relaxed text-gray-800">
                    {hasBoldText ? (
                      <span>
                        {parts.map((part, partIndex) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return (
                              <strong key={partIndex} className="font-semibold">
                                {part.slice(2, -2)}
                              </strong>
                            )
                          }
                          return part
                        })}
                      </span>
                    ) : (
                      trimmedParagraph
                    )}
                  </p>
                )
              }
            })}
          </div>
        )
      }
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
