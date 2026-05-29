/**
 * Shadow test local — intégrité moteur PDF (Zod + nettoyage URLs + fallbacks défensifs).
 *
 * Usage : npx tsx --tsconfig tsconfig.json scripts/pdf-shadow-test.ts
 */

import { PdfUseCaseSchema } from '../lib/validations/pdf.schema'
import {
  applyRule67PointsSync,
  buildRule67PointsLine,
  cleanPdfUrls,
  sanitizePdfReportData,
} from '../lib/pdf-payload-service'
import type { PDFReportData } from '../app/usecases/[id]/components/pdf/types'

/** Payload legacy volontairement incomplet (rapport antérieur à history/documents). */
const LEGACY_RAW_PAYLOAD: Record<string, unknown> = {
  useCase: {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Assistant RH — pré-sélection CV',
    description:
      'Automatisation du tri de candidatures. Voir https://www.maydai.io/dashboard/acme-corp/dossiers/legacy-case/system_prompt pour la preuve.',
    status: 'completed',
    risk_level: 'limited',
    score_final: 72,
    // score_model absent volontairement
    history: [],
    documents: [],
  },
  nextSteps: {
    recommendations: 'Plan de mise en conformité progressif.',
    timeline: '6 mois',
    introduction:
      'Consultez la todo : https://app.maydai.io/dashboard/acme-corp/todo-list?doc=human_oversight',
    quick_win_1:
      'Documenter le prompt système via https://www.maydai.io/dashboard/acme-corp/dossiers/legacy-case/system_prompt',
  },
  score: {
    score: 72,
    is_eliminated: false,
    category_scores: [],
  },
  riskLevel: {
    risk_level: 'limited',
  },
  profile: {
    email: 'shadow-test@maydai.io',
  },
  generatedDate: new Date().toISOString(),
}

function defensivePdfUseCaseSlice(raw: Record<string, unknown>) {
  const useCase = (raw.useCase ?? {}) as Record<string, unknown>

  return {
    score_final:
      typeof useCase.score_final === 'number'
        ? useCase.score_final
        : typeof useCase.score_final === 'string' && useCase.score_final.trim() !== ''
          ? Number(useCase.score_final)
          : null,
    score_model:
      typeof useCase.score_model === 'number'
        ? useCase.score_model
        : typeof useCase.score_model === 'string' && useCase.score_model.trim() !== ''
          ? Number(useCase.score_model)
          : null,
    history: Array.isArray(useCase.history) ? useCase.history : [],
    documents: Array.isArray(useCase.documents) ? useCase.documents : [],
  }
}

function defensivePdfReportData(raw: Record<string, unknown>): PDFReportData {
  const useCase = (raw.useCase ?? {}) as PDFReportData['useCase']
  const score = (raw.score ?? {}) as PDFReportData['score']
  const riskLevel = (raw.riskLevel ?? { risk_level: null }) as PDFReportData['riskLevel']
  const profile = (raw.profile ?? { email: 'unknown@maydai.io' }) as PDFReportData['profile']

  return {
    pdfCtaBaseUrl: typeof raw.pdfCtaBaseUrl === 'string' ? raw.pdfCtaBaseUrl : undefined,
    canonicalPlanItems: Array.isArray(raw.canonicalPlanItems) ? raw.canonicalPlanItems : [],
    useCase: {
      ...useCase,
      history: Array.isArray(useCase.history) ? useCase.history : [],
      documents: Array.isArray(useCase.documents) ? useCase.documents : [],
      score_final:
        typeof useCase.score_final === 'number'
          ? useCase.score_final
          : typeof score?.score === 'number'
            ? score.score
            : null,
      score_model: typeof useCase.score_model === 'number' ? useCase.score_model : null,
    },
    riskLevel,
    score: {
      score: typeof score.score === 'number' ? score.score : 0,
      is_eliminated: Boolean(score.is_eliminated),
      category_scores: Array.isArray(score.category_scores) ? score.category_scores : [],
    },
    nextSteps: (raw.nextSteps as PDFReportData['nextSteps']) ?? null,
    profile,
    generatedDate: typeof raw.generatedDate === 'string' ? raw.generatedDate : new Date().toISOString(),
  }
}

function runShadowTest() {
  console.log('=== PDF Shadow Test — démarrage ===\n')

  const useCaseSlice = defensivePdfUseCaseSlice(LEGACY_RAW_PAYLOAD)
  console.log('[1] Slice défensif useCase (fallbacks):')
  console.log(JSON.stringify(useCaseSlice, null, 2))

  const zodResult = PdfUseCaseSchema.safeParse(useCaseSlice)
  console.log('\n[2] Validation Zod (PdfUseCaseSchema):')
  if (zodResult.success) {
    console.log('✅ OK — payload conforme')
    console.log(JSON.stringify(zodResult.data, null, 2))
  } else {
    console.log('❌ Échec validation (attendu si mock volontairement invalide)')
    console.log(zodResult.error.flatten())
  }

  const rawIntro = (LEGACY_RAW_PAYLOAD.nextSteps as { introduction?: string })?.introduction ?? ''
  const rawDescription = (LEGACY_RAW_PAYLOAD.useCase as { description?: string })?.description ?? ''

  console.log('\n[3] Nettoyage URLs (cleanPdfUrls):')
  console.log('  Avant (intro):', rawIntro)
  console.log('  Après (intro):', cleanPdfUrls(rawIntro))
  console.log('  Avant (description):', rawDescription)
  console.log('  Après (description):', cleanPdfUrls(rawDescription))

  const hasRawUrlAfterClean =
    /https?:\/\//i.test(cleanPdfUrls(rawIntro)) || /https?:\/\//i.test(cleanPdfUrls(rawDescription))
  console.log('  URLs brutes restantes:', hasRawUrlAfterClean ? 'OUI (échec)' : 'NON (OK)')

  const reportData = defensivePdfReportData(LEGACY_RAW_PAYLOAD)
  const sanitized = sanitizePdfReportData(reportData)

  console.log('\n[4] sanitizePdfReportData (pipeline complet sans crash):')
  console.log('  description nettoyée:', sanitized.useCase.description)
  console.log('  introduction nettoyée:', sanitized.nextSteps?.introduction ?? '(absente)')
  console.log('  history length:', sanitized.useCase.history?.length ?? 0)
  console.log('  documents length:', sanitized.useCase.documents?.length ?? 0)
  console.log('  score_final:', sanitized.useCase.score_final)
  console.log('  score_model:', sanitized.useCase.score_model ?? '— (fallback null)')

  const mockCanonicalItem = {
    identity: {
      canonical_action_code: 'MAYDAI_SYSTEM_PROMPT',
      doc_type_canonique: 'system_prompt',
      report_slot_key: 'quick_win_1',
      action_label: 'Prompt système',
      risk_level: 'limited' as const,
    },
    legal: {
      code: 'BPGV' as const,
      label_long: 'Bonne pratique',
      basis_primary: 'Article 52 AI Act',
    },
    declaration: { status: 'OUI' as const },
    evidence: { status: 'incomplete' as const },
    governance: { rationale: 'Documenter le prompt.' },
    narrative: {
      text: sanitized.nextSteps?.quick_win_1 ?? '',
      source_slot_key: 'quick_win_1',
    },
    cta: {
      completed: false,
      todoUrl: '/dashboard/acme/todo-list',
      dossierUrl: '/dashboard/acme/dossiers/legacy/system_prompt',
      label: 'Compléter le prompt',
      points: 5,
    },
  }

  const pointsLine = buildRule67PointsLine(mockCanonicalItem, sanitized.useCase.documents ?? [])
  const syncedItems = applyRule67PointsSync([mockCanonicalItem], sanitized.useCase.documents ?? [])

  console.log('\n[5] Règle 6.7 avec documents: [] (ne doit pas présumer Acquis):')
  console.log('  pointsLine:', pointsLine)
  console.log('  synced cta.pointsLine:', syncedItems[0]?.cta.pointsLine)

  console.log('\n=== PDF Shadow Test — terminé sans crash ===')
}

try {
  runShadowTest()
} catch (error) {
  console.error('\n=== PDF Shadow Test — CRASH ===')
  console.error(error)
  process.exit(1)
}
