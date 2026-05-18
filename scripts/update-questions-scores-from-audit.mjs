/**
 * Met à jour questions-with-scores.json (et copie identique vers Supabase)
 * à partir de audit_scores_principes.csv + règles produit E4.N8.Q11 / E4.N8.Q2–Q8.
 *
 * Usage: node scripts/update-questions-scores-from-audit.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const PATH_JSON_APP = path.join(
  ROOT,
  'app/usecases/[id]/data/questions-with-scores.json'
)
const PATH_JSON_EDGE = path.join(
  ROOT,
  'supabase/functions/calculate-usecase-score/questions-data.json'
)
const PATH_CSV = path.join(ROOT, 'audit_scores_principes.csv')

/** Règle 1 : une seule catégorie métier par option (remplace tout `category_impacts`). */
const RULE1_CATEGORY_IMPACTS = {
  'E4.N8.Q11.0.A': { technical_robustness: -1 },
  'E4.N8.Q11.1.A': { technical_robustness: -1 },
  'E4.N8.Q11.1.B': { technical_robustness: -1 },
  'E4.N8.Q11.T1.A': { transparency: -2 },
  'E4.N8.Q11.T1.B': { technical_robustness: -0.5 },
  'E4.N8.Q11.T1.C': { transparency: -1 },
  'E4.N8.Q11.T1.D': { technical_robustness: -1 },
  'E4.N8.Q11.T1.E': { technical_robustness: -1 },
  'E4.N8.Q11.T1E.B': { technical_robustness: -1 },
  'E4.N8.Q11.T1E.C': { technical_robustness: -1 },
  'E4.N8.Q11.T2.A': { transparency: -1 },
  'E4.N8.Q11.T2.B': { transparency: -1 },
  'E4.N8.Q11.T2.C': { transparency: -1 },
  'E4.N8.Q11.M1.A': { social_environmental: -3 },
  'E4.N8.Q11.M2.A': { transparency: -1 },
  'E4.N8.Q11.M2.B': { transparency: -1 }
}

/** Règle 2 : libellé question + `category_impacts` sur l’option « Oui » (.A). */
const RULE2_BY_QUESTION_ID = {
  'E4.N8.Q2': {
    question: 'Données personnelles et RGPD',
    optionCode: 'E4.N8.Q2.A',
    category_impacts: { privacy_data: -2 }
  },
  'E4.N8.Q3': {
    question: 'Décisions automatisées',
    optionCode: 'E4.N8.Q3.A',
    category_impacts: { human_agency: -2 }
  },
  'E4.N8.Q4': {
    question: 'Apprentissage automatique',
    optionCode: 'E4.N8.Q4.A',
    category_impacts: { technical_robustness: -2 }
  },
  'E4.N8.Q5': {
    question: 'Contact utilisateurs',
    optionCode: 'E4.N8.Q5.A',
    category_impacts: { transparency: -2 }
  },
  'E4.N8.Q6': {
    question: 'Prédictions/recommandations',
    optionCode: 'E4.N8.Q6.A',
    category_impacts: { diversity_fairness: -2 }
  },
  'E4.N8.Q7': {
    question: 'Environnement critique',
    optionCode: 'E4.N8.Q7.A',
    category_impacts: { risk_level: -10 }
  },
  'E4.N8.Q8': {
    question: 'Surveillance continue',
    optionCode: 'E4.N8.Q8.A',
    category_impacts: { human_agency: -2 }
  }
}

function parseNum(s) {
  const t = String(s).trim()
  if (t === '') return null
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const rows = []
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(';').map((c) => c.trim())
    rows.push(parts)
  }
  return rows
}

function findOptionInData(data, optionCode) {
  for (const qid of Object.keys(data)) {
    const q = data[qid]
    if (!q || !Array.isArray(q.options)) continue
    const idx = q.options.findIndex((o) => o.code === optionCode)
    if (idx >= 0) return { questionId: qid, question: q, option: q.options[idx], optionIndex: idx }
  }
  return null
}

function applyCsvRows(data, csvRows) {
  const header = csvRows[0]
  if (!header || !header[0].includes('Question_ID')) {
    throw new Error('CSV: en-tête attendu avec Question_ID')
  }

  /** @type {Map<string, { global: number | null, cats: Record<string, number> }>} */
  const byOption = new Map()

  for (let r = 1; r < csvRows.length; r++) {
    const row = csvRows[r]
    if (row.length < 7) continue
    const optionCode = row[2]
    if (!optionCode) continue
    const g = parseNum(row[4])
    const catId = row[5]?.trim() ?? ''
    const catVal = parseNum(row[6])

    if (!byOption.has(optionCode)) {
      byOption.set(optionCode, { global: null, cats: {} })
    }
    const entry = byOption.get(optionCode)
    if (g !== null) entry.global = g
    if (catId && catVal !== null) {
      entry.cats[catId] = catVal
    }
  }

  let missing = []
  for (const [optionCode, entry] of byOption) {
    const found = findOptionInData(data, optionCode)
    if (!found) {
      missing.push(optionCode)
      continue
    }
    const { option } = found
    if (entry.global !== null) {
      option.score_impact = entry.global
    }
    const keys = Object.keys(entry.cats)
    if (keys.length === 0) {
      delete option.category_impacts
    } else {
      option.category_impacts = { ...entry.cats }
    }
  }

  if (missing.length) {
    console.warn('Options du CSV absentes du JSON (ignorées):', missing.join(', '))
  }
}

function applyRule2(data) {
  for (const [qid, spec] of Object.entries(RULE2_BY_QUESTION_ID)) {
    const q = data[qid]
    if (!q) {
      console.warn('Règle 2: question absente', qid)
      continue
    }
    q.question = spec.question
    const opt = q.options?.find((o) => o.code === spec.optionCode)
    if (!opt) {
      console.warn('Règle 2: option absente', spec.optionCode)
      continue
    }
    opt.category_impacts = { ...spec.category_impacts }
  }
}

function applyRule1(data) {
  for (const [optionCode, impacts] of Object.entries(RULE1_CATEGORY_IMPACTS)) {
    const found = findOptionInData(data, optionCode)
    if (!found) {
      console.warn('Règle 1: option absente', optionCode)
      continue
    }
    found.option.category_impacts = { ...impacts }
  }
}

function main() {
  const csvRaw = fs.readFileSync(PATH_CSV, 'utf8')
  const csvRows = parseCsv(csvRaw)

  const jsonRaw = fs.readFileSync(PATH_JSON_APP, 'utf8')
  const data = JSON.parse(jsonRaw)

  applyCsvRows(data, csvRows)
  applyRule2(data)
  applyRule1(data)

  const out = JSON.stringify(data, null, 2) + '\n'
  fs.writeFileSync(PATH_JSON_APP, out, 'utf8')
  fs.writeFileSync(PATH_JSON_EDGE, out, 'utf8')

  console.log('Écrit:', PATH_JSON_APP)
  console.log('Écrit:', PATH_JSON_EDGE)
}

main()
