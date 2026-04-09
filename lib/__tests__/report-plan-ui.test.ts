import { getCanonicalActionByReportSlot } from '@/lib/canonical-actions'
import { getReportPlanNarrativeLine } from '@/lib/report-plan-ui'

describe('getReportPlanNarrativeLine', () => {
  const action = getCanonicalActionByReportSlot('priorite_2')
  if (!action) throw new Error('fixture action manquante')

  test('texte LLM avec préfixe NON + slot Hors périmètre → préfixe réaligné (incohérence badge / narrative)', () => {
    const out = getReportPlanNarrativeLine(
      'NON : Le contenu doit être marqué. Références : Art. 50.',
      'Hors périmètre',
      action
    )
    expect(out.startsWith('Hors périmètre : ')).toBe(true)
    expect(out).toContain('Le contenu doit être marqué')
    expect(out.startsWith('NON :')).toBe(false)
  })

  test('texte LLM avec préfixe OUI + slot NON → préfixe réaligné', () => {
    const out = getReportPlanNarrativeLine('OUI : Ancien texte.', 'NON', action)
    expect(out).toBe('NON : Ancien texte.')
  })

  test('texte LLM sans préfixe connu + slot connu → préfixe imposé', () => {
    const out = getReportPlanNarrativeLine('Paragraphe sans préfixe.', 'Information insuffisante', action)
    expect(out).toBe('Information insuffisante : Paragraphe sans préfixe.')
  })

  test('slotStatus inconnu (null) : texte LLM conservé tel quel', () => {
    const raw = 'NON : On garde le libellé LLM si pas de statut slot.'
    expect(getReportPlanNarrativeLine(raw, null, action)).toBe(raw)
  })

  test('texte LLM vide : fallback catalogue inchangé (NON)', () => {
    const out = getReportPlanNarrativeLine('', 'NON', action)
    expect(out).toContain(action.label)
    expect(out).toContain('absente ou insuffisante')
  })
})
