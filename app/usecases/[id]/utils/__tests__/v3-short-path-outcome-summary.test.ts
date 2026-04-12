import {
  buildV3ShortPathMailtoHref,
  buildV3ShortPathShareableMarkdown,
  buildV3ShortPathShareablePlainText,
  getV3ShortPathImmediateImplicationLines,
  getV3ShortPathWhyLongPathBullets,
  v3ShortPathExportBasename,
  v3ShortPathQualificationShortLabel,
  v3ShortPathRiskDisplayLabel,
  V3_SHORT_PATH_ESTABLISHED_CORE_BULLETS,
  V3_SHORT_PATH_REMAINING_ITEMS,
} from '../v3-short-path-outcome-summary'

describe('v3-short-path-outcome-summary', () => {
  it('expose des listes de fond non vides', () => {
    expect(V3_SHORT_PATH_ESTABLISHED_CORE_BULLETS.length).toBeGreaterThanOrEqual(3)
    expect(V3_SHORT_PATH_REMAINING_ITEMS.length).toBeGreaterThanOrEqual(4)
  })

  describe('v3ShortPathRiskDisplayLabel', () => {
    it('qualifié + limited → libellé long', () => {
      expect(v3ShortPathRiskDisplayLabel('limited', 'qualified')).toContain('limité')
    })

    it('impossible → message sans palier', () => {
      expect(v3ShortPathRiskDisplayLabel(null, 'impossible')).toContain('impossible')
      expect(v3ShortPathRiskDisplayLabel(null, 'impossible')).toContain('Niveau non positionné')
    })
  })

  describe('v3ShortPathQualificationShortLabel', () => {
    it('couvre qualified et impossible', () => {
      expect(v3ShortPathQualificationShortLabel('qualified')).toContain('Qualification')
      expect(v3ShortPathQualificationShortLabel('impossible')).toContain('impossible')
    })
  })

  describe('getV3ShortPathImmediateImplicationLines', () => {
    it('impossible : deux lignes explicatives', () => {
      const lines = getV3ShortPathImmediateImplicationLines(null, 'impossible')
      expect(lines.length).toBeGreaterThanOrEqual(2)
      expect(lines.join(' ')).toMatch(/parcours complet|compléments/i)
    })

    it('limited : mention obligations sans confondre avec preuve', () => {
      const lines = getV3ShortPathImmediateImplicationLines('limited', 'qualified')
      expect(lines.join(' ')).toMatch(/limité|AI Act/i)
      expect(lines.join(' ')).not.toMatch(/score de conformité/i)
    })
  })

  describe('getV3ShortPathWhyLongPathBullets', () => {
    it('impossible : inclut une mention de levée d’ambiguïté', () => {
      const b = getV3ShortPathWhyLongPathBullets('impossible')
      expect(b[0]).toMatch(/questions|moteur/i)
    })
  })

  describe('buildV3ShortPathShareablePlainText', () => {
    it('structure un texte copiable avec sections et disclaimer', () => {
      const text = buildV3ShortPathShareablePlainText({
        useCaseName: 'Mon cas test',
        riskLevel: 'minimal',
        classificationStatus: 'qualified',
        signals: [{ title: 'Sensibilisation', detail: 'Réponse X.' }],
        origin: 'https://app.test',
        links: [{ label: 'Synthèse', path: '/usecases/abc' }],
      })
      expect(text).toContain('PRÉ-DIAGNOSTIC AI ACT')
      expect(text).toContain('Mon cas test')
      expect(text).toContain('Ce pré-diagnostic a permis d’établir')
      expect(text).toContain('Sensibilisation')
      expect(text).toContain('Ce qui reste hors périmètre')
      expect(text).toMatch(/audit juridique|Document interne/i)
      expect(text).toContain('https://app.test/usecases/abc')
    })
  })

  describe('v3ShortPathExportBasename', () => {
    it('produit un nom de fichier ASCII stable', () => {
      const name = v3ShortPathExportBasename({
        useCaseName: 'Mon Super Cas !',
        useCaseId: 'abc-123-def',
      })
      expect(name).toMatch(/^maydai-prediagnostic-court-/)
      expect(name).toContain('mon-super-cas')
      expect(name).toMatch(/abc-123-def/i)
    })
  })

  describe('buildV3ShortPathShareableMarkdown', () => {
    it('structure du Markdown avec titres et liens', () => {
      const md = buildV3ShortPathShareableMarkdown({
        useCaseName: 'Cas MD',
        riskLevel: 'limited',
        classificationStatus: 'qualified',
        signals: [],
        origin: 'https://x.test',
        links: [{ label: 'Synthèse', path: '/usecases/u1' }],
      })
      expect(md).toContain('# Pré-diagnostic AI Act')
      expect(md).toContain('## Qualification AI Act')
      expect(md).toContain('## Ce pré-diagnostic a permis d’établir')
      expect(md).toContain('[Synthèse](https://x.test/usecases/u1)')
      expect(md).toContain('*Document interne')
    })
  })

  describe('buildV3ShortPathMailtoHref', () => {
    it('produit un lien mailto encodé', () => {
      const href = buildV3ShortPathMailtoHref({
        useCaseName: 'Test',
        overviewUrl: 'https://app.example/usecases/1',
      })
      expect(href.startsWith('mailto:')).toBe(true)
      expect(href).toContain('subject=')
      expect(href).toContain('body=')
      expect(decodeURIComponent(href)).toContain('Synthèse du cas')
    })
  })
})
