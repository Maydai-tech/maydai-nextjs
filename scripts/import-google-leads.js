#!/usr/bin/env node
/**
 * Import rattrapage : envoie chaque ligne de historique-leads.csv vers le webhook Google Leads production.
 * Usage : GOOGLE_WEBHOOK_SECRET=... node scripts/import-google-leads.js
 */

const fs = require('fs')
const path = require('path')

const CSV_FILENAME = 'historique-leads.csv'
const CSV_PATH = path.join(__dirname, '..', CSV_FILENAME)
const WEBHOOK_URL = 'https://www.maydai.io/api/webhooks/google-leads'

const REQUIRED_HEADERS = ['E-mail', 'Prénom', 'Nom', 'N° de téléphone']

function splitLines(raw) {
  return raw
    .split(/\r\n|\n|\r/)
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l.length > 0)
}

function splitCsvRow(line) {
  return line.split(',').map((cell) => cell.trim())
}

async function main() {
  const secret = process.env.GOOGLE_WEBHOOK_SECRET
  if (!secret) {
    console.error('Erreur : GOOGLE_WEBHOOK_SECRET est requis dans l’environnement.')
    process.exit(1)
  }

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Erreur : fichier introuvable : ${CSV_PATH}`)
    process.exit(1)
  }

  const raw = fs.readFileSync(CSV_PATH, 'utf8')
  const lines = splitLines(raw)
  if (lines.length < 2) {
    console.error('Erreur : CSV vide ou sans lignes de données.')
    process.exit(1)
  }

  const headerCells = splitCsvRow(lines[0])
  const headerIndex = {}
  for (const name of REQUIRED_HEADERS) {
    const idx = headerCells.findIndex((h) => h === name)
    if (idx === -1) {
      console.error(
        `Erreur : colonne "${name}" absente des en-têtes. Trouvés : ${headerCells.join(' | ')}`
      )
      process.exit(1)
    }
    headerIndex[name] = idx
  }

  const idxEmail = headerIndex['E-mail']
  const idxPrenom = headerIndex['Prénom']
  const idxNom = headerIndex['Nom']
  const idxTel = headerIndex['N° de téléphone']

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvRow(lines[i])
    const email = (cells[idxEmail] ?? '').trim()
    const first_name = (cells[idxPrenom] ?? '').trim()
    const last_name = (cells[idxNom] ?? '').trim()
    const phone = (cells[idxTel] ?? '').trim()

    const body = {
      google_key: secret,
      user_column_data: [
        { column_id: 'EMAIL', string_value: email },
        { column_id: 'FIRST_NAME', string_value: first_name },
        { column_id: 'LAST_NAME', string_value: last_name },
        { column_id: 'PHONE_NUMBER', string_value: phone },
      ],
    }

    let label = 'Erreur'
    let detail = ''

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      let payloadText = await res.text()
      let parsedJson = null
      try {
        parsedJson = JSON.parse(payloadText)
      } catch {
        /* réponse non-JSON */
      }

      if (res.ok) {
        label = 'Succès'
        detail =
          parsedJson && typeof parsedJson === 'object'
            ? JSON.stringify(parsedJson)
            : payloadText.slice(0, 200)
      } else {
        detail =
          parsedJson && typeof parsedJson === 'object'
            ? JSON.stringify(parsedJson)
            : `${res.status} ${res.statusText} — ${payloadText.slice(0, 300)}`
      }
    } catch (err) {
      detail = err instanceof Error ? err.message : String(err)
    }

    console.log(`[${label}] ${email || '(e-mail vide)'} — ${detail}`)

    await new Promise((r) => setTimeout(r, 1000))
  }
}

main().catch((e) => {
  console.error('Erreur fatale :', e)
  process.exit(1)
})
