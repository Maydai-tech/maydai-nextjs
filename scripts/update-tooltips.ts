/**
 * Script pour mettre à jour massivement les infobulles du questionnaire
 * 
 * Format de soumission attendu :
 * Question: [texte]
 * Catégorie: [Question | Réponse]
 * Texte: [contenu pour questions]
 * Réponse: [contenu pour réponses]
 */

import * as fs from 'fs'
import * as path from 'path'

// Types pour les données parsées
interface ParsedEntry {
  questionText: string
  category: 'Question' | 'Réponse'
  content: string // Texte pour questions ou Réponse pour réponses
}

interface TooltipUpdate {
  questionId?: string
  optionCode?: string
  content: string
  category: 'Question' | 'Réponse'
  matchedText: string
}

interface UpdateResult {
  updated: number
  created: number
  notFound: Array<{ entry: ParsedEntry; reason: string }>
  ambiguous: Array<{ entry: ParsedEntry; matches: TooltipUpdate[] }>
  details: Array<{ type: string; id: string; action: string; file: string }>
}

/**
 * Parse le format de soumission utilisateur
 */
export function parseUserInput(input: string): ParsedEntry[] {
  const entries: ParsedEntry[] = []
  const lines = input.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  let currentEntry: Partial<ParsedEntry> = {}
  
  for (const line of lines) {
    if (line.startsWith('Question:')) {
      // Si on a déjà une entrée en cours, la sauvegarder
      if (currentEntry.questionText && currentEntry.category && currentEntry.content) {
        entries.push(currentEntry as ParsedEntry)
      }
      currentEntry = {
        questionText: line.replace('Question:', '').trim()
      }
    } else if (line.startsWith('Catégorie:')) {
      const category = line.replace('Catégorie:', '').trim() as 'Question' | 'Réponse'
      if (category === 'Question' || category === 'Réponse') {
        currentEntry.category = category
      }
    } else if (line.startsWith('Texte:')) {
      if (currentEntry.category === 'Question') {
        currentEntry.content = line.replace('Texte:', '').trim()
      }
    } else if (line.startsWith('Réponse:')) {
      if (currentEntry.category === 'Réponse') {
        currentEntry.content = line.replace('Réponse:', '').trim()
      }
    }
  }
  
  // Ajouter la dernière entrée
  if (currentEntry.questionText && currentEntry.category && currentEntry.content) {
    entries.push(currentEntry as ParsedEntry)
  }
  
  return entries
}

/**
 * Normalise un texte pour la comparaison (insensible à la casse, espaces normalisés)
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Trouve une correspondance exacte ou partielle
 */
function findMatch(text: string, target: string): boolean {
  const normalizedText = normalizeText(text)
  const normalizedTarget = normalizeText(target)
  
  // Correspondance exacte
  if (normalizedText === normalizedTarget) {
    return true
  }
  
  // Correspondance partielle (contient)
  if (normalizedText.includes(normalizedTarget) || normalizedTarget.includes(normalizedText)) {
    return true
  }
  
  return false
}

/**
 * Valide la longueur du contenu (max 300 caractères)
 */
function validateContent(content: string): { valid: boolean; error?: string } {
  if (content.length > 300) {
    return {
      valid: false,
      error: `Le contenu dépasse 300 caractères (${content.length} caractères)`
    }
  }
  return { valid: true }
}

/**
 * Trouve les correspondances dans les fichiers JSON
 * Retourne toutes les correspondances possibles pour chaque entrée
 */
export function findMatches(
  entries: ParsedEntry[],
  questionsData: any,
  creationQuestionsData: any
): { updates: TooltipUpdate[]; ambiguous: Array<{ entry: ParsedEntry; matches: TooltipUpdate[] }> } {
  const updates: TooltipUpdate[] = []
  const ambiguous: Array<{ entry: ParsedEntry; matches: TooltipUpdate[] }> = []
  
  for (const entry of entries) {
    const validation = validateContent(entry.content)
    if (!validation.valid) {
      continue
    }
    
    const matches: TooltipUpdate[] = []
    
    if (entry.category === 'Question') {
      // Chercher dans questions-with-scores.json
      for (const [questionId, questionData] of Object.entries(questionsData)) {
        const q = questionData as any
        if (findMatch(entry.questionText, q.question)) {
          matches.push({
            questionId,
            content: entry.content,
            category: 'Question',
            matchedText: q.question
          })
        }
      }
      
      // Chercher dans creation-questions.json
      for (const [questionId, questionData] of Object.entries(creationQuestionsData)) {
        const q = questionData as any
        if (findMatch(entry.questionText, q.question)) {
          // Vérifier si on a déjà cette correspondance
          const exists = matches.some(m => m.questionId === questionId)
          if (!exists) {
            matches.push({
              questionId,
              content: entry.content,
              category: 'Question',
              matchedText: q.question
            })
          }
        }
      }
    } else if (entry.category === 'Réponse') {
      // Chercher dans les options de questions-with-scores.json
      for (const [questionId, questionData] of Object.entries(questionsData)) {
        const q = questionData as any
        if (q.options && Array.isArray(q.options)) {
          for (const option of q.options) {
            if (findMatch(entry.questionText, option.label)) {
              matches.push({
                questionId,
                optionCode: option.code,
                content: entry.content,
                category: 'Réponse',
                matchedText: option.label
              })
            }
          }
        }
      }
      
      // Chercher dans les options de creation-questions.json
      for (const [questionId, questionData] of Object.entries(creationQuestionsData)) {
        const q = questionData as any
        if (q.options && Array.isArray(q.options)) {
          for (let idx = 0; idx < q.options.length; idx++) {
            const option = q.options[idx]
            // Les options peuvent être des strings ou des objets avec label
            const optionLabel = typeof option === 'string' ? option : option.label
            if (optionLabel && findMatch(entry.questionText, optionLabel)) {
              // Vérifier si on a déjà cette correspondance
              const optionCode = option.code || `${questionId}.${idx}`
              const exists = matches.some(m => 
                m.questionId === questionId && m.optionCode === optionCode
              )
              if (!exists) {
                matches.push({
                  questionId,
                  optionCode: optionCode,
                  content: entry.content,
                  category: 'Réponse',
                  matchedText: optionLabel
                })
              }
            }
          }
        }
      }
    }
    
    if (matches.length === 0) {
      // Aucune correspondance trouvée - sera géré dans la fonction principale
    } else if (matches.length === 1) {
      // Correspondance unique - ajouter directement
      updates.push(matches[0])
    } else {
      // Plusieurs correspondances - utiliser la première mais signaler l'ambiguïté
      updates.push(matches[0])
      ambiguous.push({ entry, matches })
    }
  }
  
  return { updates, ambiguous }
}

/**
 * Met à jour ou crée un tooltip en préservant les propriétés existantes
 */
function updateTooltip(
  data: any,
  update: TooltipUpdate,
  isCreationFile: boolean
): { updated: boolean; created: boolean } {
  let updated = false
  let created = false
  
  if (update.category === 'Question') {
    const question = data[update.questionId!]
    if (!question) return { updated: false, created: false }
    
    if (!question.tooltip) {
      question.tooltip = {
        title: question.question || update.matchedText,
        shortContent: update.content,
        icon: '💡'
      }
      if (isCreationFile) {
        question.tooltip.fullContent = update.content
      }
      created = true
    } else {
      question.tooltip.shortContent = update.content
      if (isCreationFile && question.tooltip.fullContent !== undefined) {
        question.tooltip.fullContent = update.content
      }
      updated = true
    }
  } else if (update.category === 'Réponse') {
    const question = data[update.questionId!]
    if (!question || !question.options) return { updated: false, created: false }
    
    // Chercher l'option par code ou par index si pas de code
    let option: any = null
    if (update.optionCode) {
      // Chercher par code d'abord
      option = question.options.find((opt: any) => opt.code === update.optionCode)
      // Si pas trouvé, chercher par index (format questionId.index)
      if (!option && update.optionCode.includes('.')) {
        const parts = update.optionCode.split('.')
        const idx = parseInt(parts[parts.length - 1])
        if (!isNaN(idx) && question.options[idx]) {
          option = question.options[idx]
        }
      }
    }
    
    // Si toujours pas trouvé, chercher par label
    if (!option) {
      option = question.options.find((opt: any) => {
        const label = typeof opt === 'string' ? opt : opt.label
        return label && normalizeText(label) === normalizeText(update.matchedText)
      })
    }
    
    if (!option) return { updated: false, created: false }
    
    // Obtenir le label de l'option (peut être string ou objet)
    const optionLabel = typeof option === 'string' ? option : option.label
    
    if (!option.tooltip) {
      option.tooltip = {
        title: optionLabel || update.matchedText,
        shortContent: update.content,
        icon: '💡'
      }
      if (isCreationFile) {
        option.tooltip.fullContent = update.content
      }
      created = true
    } else {
      option.tooltip.shortContent = update.content
      if (isCreationFile && option.tooltip.fullContent !== undefined) {
        option.tooltip.fullContent = update.content
      }
      updated = true
    }
  }
  
  return { updated, created }
}

/**
 * Fonction principale pour mettre à jour les tooltips
 */
export function updateTooltips(input: string): UpdateResult {
  const result: UpdateResult = {
    updated: 0,
    created: 0,
    notFound: [],
    ambiguous: [],
    details: []
  }
  
  // Parser l'input
  const entries = parseUserInput(input)
  
  if (entries.length === 0) {
    throw new Error('Aucune entrée valide trouvée dans l\'input')
  }
  
  // Charger les fichiers JSON
  const questionsPath = path.join(process.cwd(), 'app/usecases/[id]/data/questions-with-scores.json')
  const creationPath = path.join(process.cwd(), 'app/usecases/new/creation-questions.json')
  
  // Vérifier que les fichiers existent
  if (!fs.existsSync(questionsPath)) {
    throw new Error(`Fichier non trouvé: ${questionsPath}`)
  }
  if (!fs.existsSync(creationPath)) {
    throw new Error(`Fichier non trouvé: ${creationPath}`)
  }
  
  // Charger et valider les fichiers JSON
  let questionsData: any
  let creationData: any
  
  try {
    questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'))
  } catch (error) {
    throw new Error(`Erreur de lecture de questions-with-scores.json: ${error}`)
  }
  
  try {
    creationData = JSON.parse(fs.readFileSync(creationPath, 'utf-8'))
  } catch (error) {
    throw new Error(`Erreur de lecture de creation-questions.json: ${error}`)
  }
  
  // Trouver les correspondances
  const { updates, ambiguous } = findMatches(entries, questionsData, creationData)
  result.ambiguous = ambiguous
  
  // Identifier les entrées non trouvées
  for (const entry of entries) {
    const found = updates.some(u => {
      if (!u.matchedText) return false
      return normalizeText(u.matchedText) === normalizeText(entry.questionText)
    })
    if (!found) {
      result.notFound.push({
        entry,
        reason: 'Aucune correspondance trouvée'
      })
    }
  }
  
  // Appliquer les mises à jour
  for (const update of updates) {
    let appliedInQuestions = false
    let appliedInCreation = false
    
    // Essayer dans questions-with-scores.json
    if (questionsData[update.questionId!]) {
      const { updated, created } = updateTooltip(questionsData, update, false)
      if (updated || created) {
        if (updated) result.updated++
        if (created) result.created++
        result.details.push({
          type: update.category,
          id: update.questionId! + (update.optionCode ? `/${update.optionCode}` : ''),
          action: updated ? 'updated' : 'created',
          file: 'questions-with-scores.json'
        })
        appliedInQuestions = true
      }
    }
    
    // Essayer dans creation-questions.json
    if (creationData[update.questionId!]) {
      const { updated, created } = updateTooltip(creationData, update, true)
      if (updated || created) {
        if (updated) result.updated++
        if (created) result.created++
        result.details.push({
          type: update.category,
          id: update.questionId! + (update.optionCode ? `/${update.optionCode}` : ''),
          action: updated ? 'updated' : 'created',
          file: 'creation-questions.json'
        })
        appliedInCreation = true
      }
    }
  }
  
  // Valider le JSON avant sauvegarde
  try {
    JSON.stringify(questionsData)
    JSON.stringify(creationData)
  } catch (error) {
    throw new Error(`Erreur de validation JSON: ${error}`)
  }
  
  // Sauvegarder les fichiers
  fs.writeFileSync(
    questionsPath,
    JSON.stringify(questionsData, null, 2) + '\n',
    'utf-8'
  )
  
  fs.writeFileSync(
    creationPath,
    JSON.stringify(creationData, null, 2) + '\n',
    'utf-8'
  )
  
  return result
}

// Si exécuté directement
if (require.main === module) {
  const input = process.argv[2]
  if (!input) {
    console.error('Usage: ts-node update-tooltips.ts "<input text>"')
    process.exit(1)
  }
  
  const result = updateTooltips(input)
  console.log('\n=== Résultats de la mise à jour ===')
  console.log(`Mis à jour: ${result.updated}`)
  console.log(`Créés: ${result.created}`)
  console.log(`Non trouvés: ${result.notFound.length}`)
  
  if (result.details.length > 0) {
    console.log('\nDétails:')
    result.details.forEach(d => {
      console.log(`  - ${d.type} ${d.id}: ${d.action}`)
    })
  }
  
  if (result.notFound.length > 0) {
    console.log('\nNon trouvés:')
    result.notFound.forEach(nf => {
      console.log(`  - ${nf.entry.questionText} (${nf.entry.category}): ${nf.reason}`)
    })
  }
}

