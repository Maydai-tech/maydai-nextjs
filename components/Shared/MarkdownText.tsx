import React from 'react'

interface MarkdownTextProps {
  text: string
  className?: string
}

/**
 * Simple composant de rendu markdown pour les cas basiques
 * Supporte: **gras**, *italique*, [liens](url), et les retours à la ligne
 */
export default function MarkdownText({ text, className = '' }: MarkdownTextProps) {
  const renderLine = (line: string, index: number) => {
    const elements: React.ReactNode[] = []
    let currentIndex = 0

    // Regex pour capturer les patterns markdown
    const patterns = [
      { regex: /\*\*([^*]+)\*\*/g, tag: 'strong' },
      { regex: /\*([^*]+)\*/g, tag: 'em' },
      { regex: /\[([^\]]+)\]\(([^)]+)\)/g, tag: 'link' }
    ]

    const matches: Array<{
      start: number
      end: number
      text: string
      type: string
      url?: string
    }> = []

    // Trouver tous les matches
    patterns.forEach(({ regex, tag }) => {
      const regexCopy = new RegExp(regex.source, regex.flags)
      let match
      while ((match = regexCopy.exec(line)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[1],
          type: tag,
          url: match[2] // Pour les liens
        })
      }
    })

    // Trier les matches par position
    matches.sort((a, b) => a.start - b.start)

    // Filtrer les matches qui se chevauchent (garder le premier)
    const filteredMatches = matches.filter((match, i) => {
      if (i === 0) return true
      const prevMatch = matches[i - 1]
      return match.start >= prevMatch.end
    })

    // Construire les éléments
    filteredMatches.forEach((match, i) => {
      // Ajouter le texte avant le match
      if (match.start > currentIndex) {
        elements.push(line.substring(currentIndex, match.start))
      }

      // Ajouter l'élément formaté
      const key = `${index}-${i}`
      if (match.type === 'strong') {
        elements.push(<strong key={key} className="font-bold">{match.text}</strong>)
      } else if (match.type === 'em') {
        elements.push(<em key={key} className="italic">{match.text}</em>)
      } else if (match.type === 'link') {
        elements.push(
          <a
            key={key}
            href={match.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {match.text}
          </a>
        )
      }

      currentIndex = match.end
    })

    // Ajouter le reste du texte
    if (currentIndex < line.length) {
      elements.push(line.substring(currentIndex))
    }

    return elements.length > 0 ? elements : line
  }

  // Diviser le texte en lignes et les rendre
  const lines = text.split('\n')

  return (
    <div className={className}>
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          {renderLine(line, index)}
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </div>
  )
}

