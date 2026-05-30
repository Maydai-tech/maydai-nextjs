import { DECLARATION_PROOF_FLOW_COPY } from '@/lib/declaration-proof-flow-copy'
import type { ReportCanonicalItem } from '@/lib/report-canonical-items'
import {
  applyRule67PointsSync,
  buildRule67PointsLine,
  cleanPdfUrls,
  extractPdfDocumentsFromUseCaseRow,
  extractPdfHistoryFromUseCaseRow,
  isPdfDocumentCompletedInPayload,
  mapUseCaseHistoryToPdfItems,
} from '@/lib/pdf-payload-service'

function makeCanonicalItem(
  docType: string,
  points: number | undefined
): ReportCanonicalItem {
  return {
    identity: {
      canonical_action_code: 'TEST_ACTION',
      doc_type_canonique: docType,
      report_slot_key: 'quick_win_1',
      action_label: 'Action test',
      risk_level: 'limited',
    },
    legal: {
      code: 'BPGV',
      label_long: 'Bonne pratique',
      basis_primary: 'Base juridique',
    },
    declaration: { status: 'OUI' },
    evidence: { status: 'incomplete' },
    governance: { rationale: 'Justification' },
    narrative: { text: 'Narratif', source_slot_key: 'quick_win_1' },
    cta: {
      completed: false,
      todoUrl: '/dashboard/c1/todo-list?doc=system_prompt',
      dossierUrl: '/dashboard/c1/dossiers/u1/system_prompt',
      label: 'Compléter le prompt',
      points,
    },
  }
}

describe('pdf-payload-service', () => {
  describe('cleanPdfUrls', () => {
    test('remplace une URL dashboard MaydAI par un libellé propre', () => {
      const input =
        'Voir https://www.maydai.io/dashboard/abc/dossiers/xyz/system_prompt pour la preuve.'
      expect(cleanPdfUrls(input)).toBe('Voir [Lien vers le dossier] pour la preuve.')
    })

    test('remplace une URL todo par le libellé todo', () => {
      const input = 'Todo : https://app.maydai.io/dashboard/c1/todo-list?doc=human_oversight'
      expect(cleanPdfUrls(input)).toContain(`[${DECLARATION_PROOF_FLOW_COPY.linkLabelTodo}]`)
    })
  })

  describe('extractPdfDocumentsFromUseCaseRow', () => {
    test('aplatit dossier_documents depuis la relation dossiers', () => {
      const docs = extractPdfDocumentsFromUseCaseRow({
        dossiers: {
          id: 'd1',
          dossier_documents: [
            { doc_type: 'system_prompt', status: 'complete' },
            { doc_type: 'human_oversight', status: 'incomplete' },
          ],
        },
      })

      expect(docs).toEqual([
        { doc_type: 'system_prompt', status: 'complete' },
        { doc_type: 'human_oversight', status: 'incomplete' },
      ])
    })
  })

  describe('mapUseCaseHistoryToPdfItems', () => {
    test('limite à 10 entrées triées par created_at DESC', () => {
      const rows = Array.from({ length: 12 }, (_, index) => ({
        id: `id-${index}`,
        usecase_id: 'u1',
        user_id: 'user-1',
        event_type: 'field_updated' as const,
        field_name: 'name',
        old_value: null,
        new_value: 'x',
        metadata: { score_change: index },
        created_at: new Date(2026, 0, index + 1).toISOString(),
        user: { first_name: 'Thomas', last_name: 'Test' },
      }))

      const mapped = mapUseCaseHistoryToPdfItems(rows)
      expect(mapped).toHaveLength(10)
      expect(mapped[0]?.id).toBe('id-11')
      expect(mapped[0]?.metadata.user_name).toBe('Thomas Test')
    })
  })

  describe('règle 6.7 — synchronisation des points', () => {
    test('ne présume pas Acquis sans document positif dans le tableau', () => {
      const item = makeCanonicalItem('system_prompt', 5)
      expect(
        buildRule67PointsLine(item, [{ doc_type: 'human_oversight', status: 'complete' }])
      ).toBe(`${DECLARATION_PROOF_FLOW_COPY.reportPdfPointsToRecoverPrefix} : +5 pt`)
    })

    test('remplace par Acquis quand le doc_type correspond avec statut positif', () => {
      const item = makeCanonicalItem('system_prompt', 5)
      expect(
        buildRule67PointsLine(item, [{ doc_type: 'system_prompt', status: 'complete' }])
      ).toBe(`${DECLARATION_PROOF_FLOW_COPY.reportPdfPointsAcquiredPrefix} (+5 pt)`)
      expect(
        isPdfDocumentCompletedInPayload('system_prompt', [
          { doc_type: 'system_prompt', status: 'validated' },
        ])
      ).toBe(true)
    })

    test('applyRule67PointsSync injecte pointsLine sur chaque item', () => {
      const items = applyRule67PointsSync(
        [makeCanonicalItem('system_prompt', 3)],
        [{ doc_type: 'system_prompt', status: 'complete' }]
      )
      expect(items[0]?.cta.pointsLine).toBe(
        `${DECLARATION_PROOF_FLOW_COPY.reportPdfPointsAcquiredPrefix} (+3 pt)`
      )
    })
  })

  describe('extractPdfHistoryFromUseCaseRow', () => {
    test('mappe usecase_history embarqué dans la ligne use case', () => {
      const history = extractPdfHistoryFromUseCaseRow({
        usecase_history: [
          {
            id: 'h1',
            usecase_id: 'u1',
            user_id: 'user-1',
            event_type: 'reevaluated',
            field_name: null,
            old_value: null,
            new_value: null,
            metadata: { score_change: 4 },
            created_at: '2026-05-01T10:00:00.000Z',
            user: { first_name: 'Alice', last_name: 'MaydAI' },
          },
        ],
      })

      expect(history).toHaveLength(1)
      expect(history[0]?.metadata.label).toBe('Évaluation complétée')
      expect(history[0]?.metadata.score_impact).toBe(4)
    })
  })
})
