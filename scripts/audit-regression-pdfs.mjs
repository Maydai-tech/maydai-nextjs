import fs from 'node:fs/promises'
import path from 'node:path'

const USECASE_IDS = [
  'fd80b21b-7c07-4349-b3c2-1c78c666f44f',
  'a695fb60-8309-4434-8168-ab5e3e6f5d78',
  '8cfabaec-d4fa-4268-8978-665f5aa90b8e',
  '18200ea4-38a5-421c-bc6e-8994ad475e33',
  '9b3857eb-f94c-4896-b41f-f18432f0a1e5',
]

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
const token = process.env.MAYDAI_REGRESSION_TOKEN

function norm(s) {
  return String(s || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
}

function pdfToSearchText(bytes) {
  // Les PDFs générés par React-PDF contiennent souvent les strings en clair.
  // latin1 évite les exceptions sur bytes non-utf8.
  return Buffer.from(bytes).toString('latin1')
}

function isoToFrenchDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  // format `dd MMMM yyyy` en fr-FR (aligné avec PDFCoverPage)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function pickCanonicalReportDateIso(usecase) {
  // Doit matcher getPdfReportDateIso(): last_calculation_date > updated_at > generatedDate
  return (
    (typeof usecase?.last_calculation_date === 'string' && usecase.last_calculation_date.trim()) ||
    (typeof usecase?.updated_at === 'string' && usecase.updated_at.trim()) ||
    null
  )
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return await res.json()
}

async function fetchPdf(url) {
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/pdf')) throw new Error(`Unexpected content-type: ${ct}`)
  const ab = await res.arrayBuffer()
  return new Uint8Array(ab)
}

async function main() {
  if (!token) {
    console.error('KO: MAYDAI_REGRESSION_TOKEN manquant (export MAYDAI_REGRESSION_TOKEN=...)')
    process.exit(2)
  }

  const outDir = path.join(process.cwd(), 'tmp', 'regression-pdfs')
  await fs.mkdir(outDir, { recursive: true })

  const results = []

  for (const id of USECASE_IDS) {
    const usecaseUrl = `${baseUrl}/api/usecases/${id}`
    const pdfUrl = `${baseUrl}/api/usecases/${id}/generate-pdf`

    const usecase = await fetchJson(usecaseUrl)
    const canonicalDescription = norm(usecase.description)

    const pdfBytes = await fetchPdf(pdfUrl)
    const pdfPath = path.join(outDir, `${id}.pdf`)
    await fs.writeFile(pdfPath, pdfBytes)

    const pdfText = pdfToSearchText(pdfBytes)
    const pdfTextNorm = norm(pdfText)

    const containsAddeus = /addeus/i.test(pdfText)
    const containsLinkedIn = /linkedin/i.test(pdfText)

    const descOk =
      canonicalDescription.length > 0
        ? pdfTextNorm.includes(canonicalDescription)
        : pdfText.includes("[Description du cas d'usage]")

    const dateIso = pickCanonicalReportDateIso(usecase)
    const expectedDateFr = dateIso ? isoToFrenchDate(dateIso) : null
    const dateOk = expectedDateFr ? pdfText.includes(expectedDateFr) : false

    const linkedInAllowed = /linkedin/i.test(canonicalDescription)
    const linkedInOk = linkedInAllowed ? true : !containsLinkedIn

    results.push({
      usecase_id: id,
      pdf_path: path.relative(process.cwd(), pdfPath),
      description_ok: descOk,
      date_ok: dateOk,
      interdit_applicable: String(usecase.risk_level || '').toLowerCase() === 'unacceptable',
      addeus_ok: !containsAddeus,
      linkedin_ok: linkedInOk,
      expected_date_fr: expectedDateFr,
      executed: {
        usecase_endpoint: '/api/usecases/[id] (GET)',
        pdf_endpoint: '/api/usecases/[id]/generate-pdf (GET)',
      },
    })
  }

  console.log(JSON.stringify({ baseUrl, results }, null, 2))
}

main().catch((e) => {
  console.error('Erreur audit PDF:', e?.stack || e)
  process.exit(1)
})

