import {
  V3_PILOTAGE_CTA_GROUPS,
  V3_PILOTAGE_ENTRY_SURFACES,
  V3_PILOTAGE_EVENTS,
  V3_PILOTAGE_FUNNEL_SHORT,
  V3_PILOTAGE_GA4_RECIPES,
  V3_PILOTAGE_PRODUCT_DECISIONS,
  v3PilotageEventNames,
} from '@/lib/v3-short-path-pilotage'

describe('v3-short-path-pilotage', () => {
  it('expose un catalogue d’événements non vide et sans doublon de nom', () => {
    const names = v3PilotageEventNames()
    expect(names.length).toBeGreaterThanOrEqual(6)
    expect(new Set(names).size).toBe(names.length)
  })

  it('décrit chaque événement avec au moins un champ', () => {
    for (const e of V3_PILOTAGE_EVENTS) {
      expect(e.event.length).toBeGreaterThan(0)
      expect(e.fields.length).toBeGreaterThan(0)
    }
  })

  it('ordonne le funnel court du start vers outcome', () => {
    expect(V3_PILOTAGE_FUNNEL_SHORT[0]?.event).toBe('v3_short_path_start')
    const last = V3_PILOTAGE_FUNNEL_SHORT[V3_PILOTAGE_FUNNEL_SHORT.length - 1]
    expect(last?.event).toBe('v3_short_path_cta')
  })

  it('liste des surfaces d’entrée avec valeurs uniques', () => {
    const values = V3_PILOTAGE_ENTRY_SURFACES.map((s) => s.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it('découpe les CTA en groupes cohérents', () => {
    expect(V3_PILOTAGE_CTA_GROUPS.partageExport).toContain('copy_summary')
    expect(V3_PILOTAGE_CTA_GROUPS.navigationPostSortie).toContain('dossier')
    expect(V3_PILOTAGE_CTA_GROUPS.conversionLong).toContain('evaluation_long')
  })

  it('fournit des recettes GA4 avec dimensions et filtres', () => {
    for (const r of V3_PILOTAGE_GA4_RECIPES) {
      expect(r.title.length).toBeGreaterThan(5)
      expect(r.dimensions.length).toBeGreaterThan(0)
      expect(r.metrics.length).toBeGreaterThan(0)
      expect(r.filters.length).toBeGreaterThan(0)
    }
  })

  it('liste des questions produit pour pilotage', () => {
    expect(V3_PILOTAGE_PRODUCT_DECISIONS.length).toBeGreaterThanOrEqual(4)
  })
})
