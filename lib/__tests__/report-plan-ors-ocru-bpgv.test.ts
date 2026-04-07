import {
  groupStandardPlanItemsByLegalCode,
  sortItemsWithinLegalGroup,
} from '@/lib/report-plan-ors-ocru-bpgv'

function makeItem(overrides: Partial<any>) {
  return {
    identity: {
      report_slot_key: overrides.identity?.report_slot_key ?? 'quick_win_1',
      canonical_action_code: 'X',
      doc_type_canonique: 'x',
      action_label: 'Action',
      risk_level: 'limited',
    },
    legal: {
      code: overrides.legal?.code ?? 'BPGV',
      label_long: 'label',
      basis_primary: 'basis',
    },
    declaration: { status: overrides.declaration?.status ?? 'NON' },
    evidence: { status: overrides.evidence?.status ?? 'incomplete' },
    governance: { rationale: 'why' },
    narrative: { text: 'text', source_slot_key: 'quick_win_1' },
    cta: {
      completed: false,
      todoUrl: '/todo',
      dossierUrl: '/dossier',
      label: 'CTA',
      points: 2,
    },
    ...overrides,
  }
}

describe('report-plan-ors-ocru-bpgv', () => {
  test('masque les groupes vides et respecte ORS → OCRU → BPGV', () => {
    const items = [
      makeItem({ legal: { code: 'BPGV' }, identity: { report_slot_key: 'quick_win_1' } }),
      makeItem({ legal: { code: 'ORS' }, identity: { report_slot_key: 'action_3' } }),
      makeItem({ legal: { code: 'OCRU' }, identity: { report_slot_key: 'priorite_2' } }),
      makeItem({ legal: { code: 'NAD' }, identity: { report_slot_key: 'priorite_3' } }),
    ]

    const groups = groupStandardPlanItemsByLegalCode(items as any)
    expect(groups.map(g => g.code)).toEqual(['ORS', 'OCRU', 'BPGV'])
    expect(groups.flatMap(g => g.items).some((i: any) => i.legal.code === 'NAD')).toBe(false)
  })

  test('cas only BPGV: retourne un seul groupe BPGV', () => {
    const items = [
      makeItem({ legal: { code: 'BPGV' }, identity: { report_slot_key: 'quick_win_1' } }),
      makeItem({ legal: { code: 'BPGV' }, identity: { report_slot_key: 'quick_win_2' } }),
    ]
    const groups = groupStandardPlanItemsByLegalCode(items as any)
    expect(groups.map(g => g.code)).toEqual(['BPGV'])
    expect(groups[0].items).toHaveLength(2)
  })

  test('tri interne: OUI + preuve absente/non suivie en haut, puis NON, puis insuffisant, puis preuves complètes/validées', () => {
    const a = makeItem({
      identity: { report_slot_key: 'quick_win_1' },
      declaration: { status: 'OUI' },
      evidence: { status: 'not_tracked' },
    })
    const b = makeItem({
      identity: { report_slot_key: 'quick_win_2' },
      declaration: { status: 'NON' },
      evidence: { status: 'incomplete' },
    })
    const c = makeItem({
      identity: { report_slot_key: 'quick_win_3' },
      declaration: { status: 'Information insuffisante' },
      evidence: { status: 'incomplete' },
    })
    const d = makeItem({
      identity: { report_slot_key: 'priorite_1' },
      declaration: { status: 'OUI' },
      evidence: { status: 'complete' },
    })
    const e = makeItem({
      identity: { report_slot_key: 'priorite_2' },
      declaration: { status: 'NON' },
      evidence: { status: 'validated' },
    })

    const sorted = sortItemsWithinLegalGroup([d, c, b, a, e] as any)
    expect(sorted.map((x: any) => x.identity.report_slot_key)).toEqual([
      'quick_win_1', // OUI + preuve manquante
      'quick_win_2', // NON
      'quick_win_3', // insuffisant
      'priorite_1', // preuve complète
      'priorite_2', // preuve validée (dernière catégorie)
    ])
  })
})

