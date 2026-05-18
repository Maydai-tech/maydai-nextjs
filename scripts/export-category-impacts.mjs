import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const jsonPath = path.join(
  projectRoot,
  'app',
  'usecases',
  '[id]',
  'data',
  'questions-with-scores.json'
)
const outPath = path.join(projectRoot, 'audit_scores_principes.csv')

/** Nettoie les textes pour un CSV délimité par `;` sans guillemets. */
function cleanCell(value) {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/;/g, ',')
    .replace(/\s+/g, ' ')
    .trim()
}

function numScoreImpact(opt) {
  const v = opt.score_impact
  if (v === null || v === undefined) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function hasSignificantScoreImpact(opt) {
  return numScoreImpact(opt) !== 0
}

const raw = fs.readFileSync(jsonPath, 'utf8')
const data = JSON.parse(raw)

const header =
  'Question_ID ; Question_Text ; Option_Code ; Option_Label ; Global_Score_Impact ; Category_ID ; Category_Impact'
const lines = [header]

for (const [, q] of Object.entries(data)) {
  if (!q || typeof q !== 'object' || !Array.isArray(q.options)) continue

  const questionId = cleanCell(q.id ?? '')
  const questionText = cleanCell(q.question ?? '')

  for (const opt of q.options) {
    if (!opt || typeof opt !== 'object') continue

    const impacts = opt.category_impacts
    const hasCategories =
      impacts && typeof impacts === 'object' && Object.keys(impacts).length > 0
    const globalImpact = numScoreImpact(opt)

    if (!hasCategories && !hasSignificantScoreImpact(opt)) continue

    const optionCode = cleanCell(opt.code ?? '')
    const optionLabel = cleanCell(opt.label ?? '')
    const globalStr = String(opt.score_impact ?? '')

    if (hasCategories) {
      for (const [catId, catVal] of Object.entries(impacts)) {
        const row = [
          questionId,
          questionText,
          optionCode,
          optionLabel,
          globalStr,
          cleanCell(catId),
          String(catVal)
        ].join(' ; ')
        lines.push(row)
      }
    } else {
      const row = [
        questionId,
        questionText,
        optionCode,
        optionLabel,
        globalStr,
        '',
        ''
      ].join(' ; ')
      lines.push(row)
    }
  }
}

fs.writeFileSync(outPath, lines.join('\n'), 'utf8')
console.log(`Écrit ${lines.length - 1} ligne(s) de données (+ en-tête) dans ${outPath}`)
