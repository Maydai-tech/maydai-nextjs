import { UseCaseNextStepsInput } from './supabase'

const ACTION_KEYS = [
  'quick_win_1', 'quick_win_2', 'quick_win_3',
  'priorite_1', 'priorite_2', 'priorite_3',
  'action_1', 'action_2', 'action_3',
] as const

type ActionKey = typeof ACTION_KEYS[number]

const SECTION_KEYS = ['introduction', 'evaluation', 'impact', 'conclusion'] as const

export interface ValidationResult {
  isValid: boolean
  missingFields: string[]
  warnings: string[]
  hasDuplicates: boolean
  duplicateDetails: string[]
}

/**
 * Calcule la similarité Jaccard entre deux textes (0 = aucun mot commun, 1 = identiques).
 * Utilisé pour détecter les quasi-doublons entre actions d'un même groupe.
 */
export function computeTextSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-zà-ÿ0-9\s]/g, '')
  const wordsA = new Set(normalize(a).split(/\s+/).filter(w => w.length > 2))
  const wordsB = new Set(normalize(b).split(/\s+/).filter(w => w.length > 2))
  if (wordsA.size === 0 || wordsB.size === 0) return 0
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length
  const union = new Set([...wordsA, ...wordsB]).size
  return union === 0 ? 0 : intersection / union
}

/**
 * Point d'entrée principal : détecte le format du rapport et extrait les données structurées.
 * Priorité : JSON direct (9 clés) > JSON tableaux > Markdown legacy.
 */
export function extractNextStepsFromReport(reportText: string): Partial<UseCaseNextStepsInput> {
  const trimmed = reportText.trim()

  if (trimmed.startsWith('{')) {
    try {
      JSON.parse(trimmed)
      console.log('[nextsteps-parser] Format JSON détecté')
      return extractNextStepsFromJSON(trimmed)
    } catch {
      // JSON invalide, on tente Markdown
    }
  }

  if (trimmed.includes('"introduction"') || trimmed.includes('"priorite_1"') || trimmed.includes('"introduction_contextuelle"')) {
    try {
      const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        JSON.parse(jsonMatch[0])
        console.log('[nextsteps-parser] JSON embarqué détecté dans du texte')
        return extractNextStepsFromJSON(jsonMatch[0])
      }
    } catch { /* pas de JSON valide embarqué */ }
  }

  if (
    trimmed.includes('## Introduction contextuelle') ||
    trimmed.includes('### Actions réglementaires et documents techniques') ||
    trimmed.includes('### Actions immédiates recommandées')
  ) {
    console.log('[nextsteps-parser] Format Markdown détecté (legacy)')
    return extractNextStepsFromMarkdown(trimmed)
  }

  console.warn('[nextsteps-parser] Format non reconnu, fallback Markdown')
  return extractNextStepsFromMarkdown(trimmed)
}

/**
 * Extraction depuis un rapport JSON.
 * Gère 3 formats par ordre de priorité :
 *   1. Clés directes (quick_win_1, priorite_1, action_1...) — format cible
 *   2. Tableaux (priorites_actions_reglementaires[], quick_wins_actions_immediates[], actions_moyen_terme[])
 *   3. Clés legacy (introduction, priorite_1 comme anciennes clés plates)
 */
export function extractNextStepsFromJSON(reportText: string): Partial<UseCaseNextStepsInput> {
  try {
    const json = JSON.parse(reportText)
    const result: Partial<UseCaseNextStepsInput> = {}

    // --- Sections narratives ---
    result.introduction = extractString(json.introduction_contextuelle) || extractString(json.introduction)
    if (result.introduction) {
      result.introduction = result.introduction.replace(/^##\s*Introduction contextuelle\s*\n?/i, '').trim()
    }

    if (json.evaluation_risque) {
      if (typeof json.evaluation_risque === 'string') {
        result.evaluation = json.evaluation_risque
      } else if (typeof json.evaluation_risque === 'object') {
        const niveau = json.evaluation_risque.niveau || ''
        const justification = json.evaluation_risque.justification || ''
        result.evaluation = `${niveau}${justification ? ': ' + justification : ''}`.trim()
      }
    }
    if (!result.evaluation && json.evaluation) {
      result.evaluation = extractString(json.evaluation)
    }

    result.impact = extractString(json.impact_attendu) || extractString(json.impact)
    if (result.impact) {
      result.impact = result.impact.replace(/^##\s*Impact attendu\s*\n?/i, '').trim()
    }

    const rawConclusion = extractString(json.conclusion)
    if (rawConclusion) {
      result.conclusion = rawConclusion.replace(/^##\s*Conclusion\s*\n?/i, '').trim()
    }

    // --- 9 actions : priorité aux clés directes ---
    for (const key of ACTION_KEYS) {
      const val = extractString(json[key])
      if (val) {
        result[key] = val
      }
    }

    // --- Fallback tableaux si des actions manquent ---
    fillFromArray(result, json.quick_wins_actions_immediates, ['quick_win_1', 'quick_win_2', 'quick_win_3'])
    fillFromArray(result, json.priorites_actions_reglementaires, ['priorite_1', 'priorite_2', 'priorite_3'])
    fillFromArray(result, json.actions_moyen_terme, ['action_1', 'action_2', 'action_3'])

    logParsedActions(result, 'JSON')
    return result
  } catch (error) {
    console.error('[nextsteps-parser] Erreur parsing JSON:', error)
    return {}
  }
}

/**
 * Extraction legacy depuis un rapport Markdown.
 * Conservé pour les anciens rapports déjà stockés.
 */
export function extractNextStepsFromMarkdown(reportText: string): Partial<UseCaseNextStepsInput> {
  const result: Partial<UseCaseNextStepsInput> = {}

  const sectionRegex = (heading: string) =>
    new RegExp(`${heading}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`)

  const introMatch = reportText.match(sectionRegex('## Introduction contextuelle'))
  if (introMatch) result.introduction = introMatch[1].trim()

  const evalMatch = reportText.match(sectionRegex('## Évaluation du niveau de risque AI Act'))
  if (evalMatch) result.evaluation = evalMatch[1].trim()

  const impactMatch = reportText.match(sectionRegex('## Impact attendu'))
  if (impactMatch) result.impact = impactMatch[1].trim()

  const conclusionMatch = reportText.match(sectionRegex('## Conclusion'))
  if (conclusionMatch) result.conclusion = conclusionMatch[1].trim()

  const subsectionRegex = (heading: string) =>
    new RegExp(`${heading}\\s*\\n([\\s\\S]*?)(?=\\n###|\\n##|$)`)

  const prioritiesMatch = reportText.match(subsectionRegex('### Actions réglementaires et documents techniques'))
  if (prioritiesMatch) {
    const items = extractBoldItemsWithDescription(prioritiesMatch[1])
    if (items.length >= 1) result.priorite_1 = items[0]
    if (items.length >= 2) result.priorite_2 = items[1]
    if (items.length >= 3) result.priorite_3 = items[2]
  }

  const qwMatch = reportText.match(subsectionRegex('### Actions immédiates recommandées'))
  if (qwMatch) {
    const items = extractBoldItemsWithDescription(qwMatch[1])
    if (items.length >= 1) result.quick_win_1 = items[0]
    if (items.length >= 2) result.quick_win_2 = items[1]
    if (items.length >= 3) result.quick_win_3 = items[2]
  }

  const actionsMatch = reportText.match(subsectionRegex('### Actions à moyen terme'))
  if (actionsMatch) {
    const items = extractBoldItemsWithDescription(actionsMatch[1])
    if (items.length >= 1) result.action_1 = items[0]
    if (items.length >= 2) result.action_2 = items[1]
    if (items.length >= 3) result.action_3 = items[2]
  }

  logParsedActions(result, 'Markdown')
  return result
}

/**
 * Validation stricte des données extraites.
 * isValid = true seulement si usecase_id + toutes les 9 actions + pas de doublons.
 */
export function validateNextStepsData(data: Partial<UseCaseNextStepsInput>): ValidationResult {
  const missingFields: string[] = []
  const warnings: string[] = []
  const duplicateDetails: string[] = []
  let hasDuplicates = false

  if (!data.usecase_id) {
    missingFields.push('usecase_id')
  }

  for (const key of ACTION_KEYS) {
    if (!data[key]) {
      missingFields.push(key)
    }
  }

  for (const key of SECTION_KEYS) {
    if (!data[key]) {
      warnings.push(`Section "${key}" manquante`)
    }
  }

  const groups: ActionKey[][] = [
    ['quick_win_1', 'quick_win_2', 'quick_win_3'],
    ['priorite_1', 'priorite_2', 'priorite_3'],
    ['action_1', 'action_2', 'action_3'],
  ]

  for (const group of groups) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const textA = data[group[i]]
        const textB = data[group[j]]
        if (textA && textB) {
          const similarity = computeTextSimilarity(textA, textB)
          if (similarity > 0.8) {
            hasDuplicates = true
            duplicateDetails.push(
              `${group[i]} ↔ ${group[j]} : similarité ${Math.round(similarity * 100)}%`
            )
          }
        }
      }
    }
  }

  const actionsMissing = missingFields.filter(f => ACTION_KEYS.includes(f as ActionKey))
  const isValid = !missingFields.includes('usecase_id') && actionsMissing.length === 0 && !hasDuplicates

  return { isValid, missingFields, warnings, hasDuplicates, duplicateDetails }
}

/**
 * Log structuré des résultats d'extraction et de validation.
 */
export function logExtractionResults(
  reportText: string,
  extractedData: Partial<UseCaseNextStepsInput>,
  validation: ValidationResult
): void {
  const filledActions = ACTION_KEYS.filter(k => !!extractedData[k]).length
  const filledSections = SECTION_KEYS.filter(k => !!extractedData[k]).length

  console.log('[nextsteps-parser] === RÉSULTATS D\'EXTRACTION ===')
  console.log(`  Rapport: ${reportText.length} caractères`)
  console.log(`  Actions remplies: ${filledActions}/9`)
  console.log(`  Sections narratives: ${filledSections}/4`)
  console.log(`  Validation: ${validation.isValid ? 'OK' : 'ÉCHEC'}`)

  if (validation.missingFields.length > 0) {
    console.log('  Champs manquants:', validation.missingFields.join(', '))
  }
  if (validation.hasDuplicates) {
    console.warn('  DOUBLONS DÉTECTÉS:', validation.duplicateDetails.join(' | '))
  }
  if (validation.warnings.length > 0) {
    console.log('  Avertissements:', validation.warnings.join(', '))
  }

  for (const key of ACTION_KEYS) {
    const val = extractedData[key]
    if (val) {
      console.log(`  ${key}: "${val.substring(0, 80)}${val.length > 80 ? '...' : ''}"`)
    } else {
      console.log(`  ${key}: (vide)`)
    }
  }
  console.log('[nextsteps-parser] === FIN ===')
}

/**
 * Nettoie et formate le texte extrait.
 */
export function cleanExtractedText(text: string): string {
  return text
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\*\*/g, '')
    .trim()
}

// ─── Fonctions utilitaires internes ─────────────────────────────────────────

function extractString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  return undefined
}

function fillFromArray(
  result: Partial<UseCaseNextStepsInput>,
  arr: unknown,
  keys: ActionKey[]
): void {
  if (!Array.isArray(arr)) return
  for (let i = 0; i < keys.length; i++) {
    if (!result[keys[i]] && arr[i]) {
      const val = extractString(arr[i])
      if (val) result[keys[i]] = val
    }
  }
}

function logParsedActions(result: Partial<UseCaseNextStepsInput>, source: string): void {
  const filled = ACTION_KEYS.filter(k => !!result[k])
  console.log(`[nextsteps-parser] Extraction ${source}: ${filled.length}/9 actions extraites`)
  if (filled.length < 9) {
    const missing = ACTION_KEYS.filter(k => !result[k])
    console.warn(`[nextsteps-parser] Actions manquantes: ${missing.join(', ')}`)
  }
}

/**
 * Extraction legacy d'éléments en gras depuis un paragraphe Markdown.
 * Conservé uniquement pour les rapports Markdown historiques.
 */
function extractBoldItemsWithDescription(text: string): string[] {
  const items: string[] = []
  const boldPattern = /\*\*([^*]+)\*\*/g
  const matches = [...text.matchAll(boldPattern)]

  if (matches.length === 0) return items

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const matchIndex = match.index!

    const textBefore = text.substring(0, matchIndex)
    const lastSentenceEnd = Math.max(
      textBefore.lastIndexOf('. '),
      textBefore.lastIndexOf('.\n'),
      textBefore.lastIndexOf('! '),
      textBefore.lastIndexOf('? ')
    )
    const startIndex = lastSentenceEnd !== -1 ? lastSentenceEnd + 2 : 0

    const afterBold = text.substring(matchIndex + match[0].length)
    let endOffset = afterBold.length
    const sentenceEndMatch = afterBold.match(/\.\s+(?=[A-ZÀ-Ú]|De plus|Par ailleurs|Enfin|En outre|Il est)/)
    if (sentenceEndMatch?.index !== undefined) {
      endOffset = sentenceEndMatch.index + 1
    }

    const fullSentence = text.substring(startIndex, matchIndex + match[0].length + endOffset).trim()
    const cleaned = fullSentence
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/^\s*[-•]\s*/, '')
      .trim()

    if (cleaned.length > 10) items.push(cleaned)
  }

  return items
}

// ─── Exports legacy (conservés pour compatibilité) ──────────────────────────

export interface NextStep {
  title: string
  description: string
  priority: 'haute' | 'moyenne' | 'faible' | 'non-spécifiée'
  deadline?: string
}

export function parseNextSteps(responseText: string): NextStep[] {
  const steps: NextStep[] = []
  const seenTitles = new Set<string>()

  const stepPatterns = [
    /(\d+)\.\s*\*\*([^*]+)\*\*\s*\([^)]*[Pp]riorit[ée]\s*:\s*([^)]+)\)[^-\n]*-?\s*([^\n]+)/g,
    /(\d+)\.\s*\*\*([^*]+)\*\*\s*-?\s*([^(\n]+?)(?:\s*\([^)]*[Éé]chéance\s*:\s*([^)]+)\))?/g,
    /-\s*\*\*([^*]+)\*\*\s*\([^)]*[Pp]riorit[ée]\s*:\s*([^)]+)\)[^-\n]*-?\s*([^\n]+)/g,
    /(\d+)\.\s*([^-\n]+?)\s*-\s*([^\n]+)/g,
    /-\s*([^-\n]+?)(?:\s*\([^)]*[Éé]chéance\s*:\s*([^)]+)\))?/g,
  ]

  for (const pattern of stepPatterns) {
    let match
    while ((match = pattern.exec(responseText)) !== null) {
      let title = ''
      let description = ''
      let priority: NextStep['priority'] = 'non-spécifiée'
      let deadline: string | undefined

      if (match.length >= 4) {
        title = match[2] || match[1]
        description = match[4] || match[3]

        const fullMatch = match[0].toLowerCase()
        if (fullMatch.includes('haute') || fullMatch.includes('critique') || fullMatch.includes('urgent')) {
          priority = 'haute'
        } else if (fullMatch.includes('moyenne') || fullMatch.includes('important')) {
          priority = 'moyenne'
        } else if (fullMatch.includes('faible') || fullMatch.includes('basse')) {
          priority = 'faible'
        }

        const deadlineMatch = match[0].match(/(\d+)\s*(semaines?|mois|jours?)/i)
        if (deadlineMatch) deadline = `${deadlineMatch[1]} ${deadlineMatch[2]}`
      }

      if (title && description) {
        const cleanTitle = title.trim()
        if (!seenTitles.has(cleanTitle)) {
          seenTitles.add(cleanTitle)
          steps.push({ title: cleanTitle, description: description.trim(), priority, deadline })
        }
      }
    }
  }

  if (steps.length === 0) return extractNextSteps(responseText)
  return steps
}

export function extractNextSteps(text: string): NextStep[] {
  const steps: NextStep[] = []
  const lines = text.split('\n')
  let currentStep: Partial<NextStep> = {}

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (/^\d+\./.test(trimmedLine) || /^-/.test(trimmedLine)) {
      if (currentStep.title && currentStep.description) {
        steps.push({
          title: currentStep.title,
          description: currentStep.description,
          priority: currentStep.priority || 'non-spécifiée',
          deadline: currentStep.deadline,
        })
      }
      const stepText = trimmedLine.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '')
      currentStep = { title: stepText, description: '', priority: 'non-spécifiée' }

      const lower = stepText.toLowerCase()
      if (lower.includes('haute') || lower.includes('critique') || lower.includes('urgent')) {
        currentStep.priority = 'haute'
      } else if (lower.includes('moyenne') || lower.includes('important')) {
        currentStep.priority = 'moyenne'
      } else if (lower.includes('faible') || lower.includes('basse')) {
        currentStep.priority = 'faible'
      }
    } else if (currentStep.title && trimmedLine && !trimmedLine.startsWith('##')) {
      currentStep.description += (currentStep.description ? ' ' : '') + trimmedLine
    }
  }

  if (currentStep.title && currentStep.description) {
    steps.push({
      title: currentStep.title,
      description: currentStep.description,
      priority: currentStep.priority || 'non-spécifiée',
      deadline: currentStep.deadline,
    })
  }

  return steps
}
