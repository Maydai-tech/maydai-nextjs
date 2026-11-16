import { categorizeStatusLabel, displayStatusLabel } from '../system-card-status-categories'
import { parseSystemCardPillars } from '../system-card-pillars-parser'
import {
  auditedMarkdown,
  englishMarkdown,
  gabaritMarkdown,
  markdownWithoutPartOne,
} from './system-card-markdown-fixtures'

describe('catégories de statut des fiches', () => {
  test.each([
    ['Documenté', 'DOCUMENTED'],
    ['**✅**', 'DOCUMENTED'],
    ['✅ Remplie', 'DOCUMENTED'],
    ['Documenté indirectement par la fiche de base', 'REFERENCED'],
    ['Renvoi au modèle de base (GPT-6)', 'REFERENCED'],
    ["À charge de l'Intégrateur", 'DOWNSTREAM'],
    ['À charge du Déployeur', 'DOWNSTREAM'],
    ['Hors périmètre public', 'NOT_PUBLISHED'],
    ['Non publié (annexe XI)', 'NOT_PUBLISHED'],
    ['Non applicable (exemption open source)', 'NOT_APPLICABLE'],
    ['⚠️ Partielle', 'RESERVATION'],
    ['Non documenté par le fournisseur', 'NOT_DOCUMENTED'],
    ['**❌** *(Niveau modèle)*', 'NOT_DOCUMENTED'],
    ['Non documenté dans la System Card', 'NOT_DOCUMENTED'],
    ['Non documenté au niveau modèle', 'NOT_DOCUMENTED'],
    ['Non documenté dans la System Card (périmètre capacités critiques CBRN et cyber)', 'NOT_DOCUMENTED'],
    ['Non évalué', 'NOT_DOCUMENTED'],
    ['Partiellement documenté', 'RESERVATION'],
    ['Partiellement documenté (périmètre sécurité de contenu)', 'RESERVATION'],
    ["Position proposée par l'agent — en attente de décision", 'RESERVATION'],
    ["**Position proposée par l'agent** (périmètre à trancher)", 'RESERVATION'],
  ])('%s → %s', (label, category) => {
    expect(categorizeStatusLabel(label)).toBe(category)
  })

  test('affiche un texte pour un libellé réduit à un emoji', () => {
    expect(displayStatusLabel('✅', 'DOCUMENTED')).toBe('Documenté')
    expect(displayStatusLabel('⚠️', 'RESERVATION')).toBe('Réserve')
    expect(displayStatusLabel('❌', 'NOT_DOCUMENTED')).toBe('Non documenté')
    expect(displayStatusLabel(undefined, 'COMPLIANT')).toBe('Documenté')
    expect(displayStatusLabel(undefined, 'NON_COMPLIANT')).toBe('Non documenté')
  })
})

function partWithRecommendations(recommendations: string): string {
  const other = [
    '### 1. Résumé technique',
    'Résumé de test.',
    '### 2. Points clés',
    '- Point un',
    '### 3. Conformité',
    '| Exigence AI Act | Article / Annexe | Application au modèle | Statut |',
    '| --- | --- | --- | --- |',
    '| Documentation technique | Art. 53 | Application de test | Documenté |',
    '### 4. Recommandations',
    '**Fournisseur :** Tenir le dossier.',
    '**Intégrateur :** Relier le système.',
    '**Déployeur :** Surveiller l\'usage.',
  ].join('\n')
  return [
    `## PARTIE 1 : Documentation technique\n### 1. Résumé technique\nRésumé de test.\n### 2. Points clés\n- Point un\n### 3. Conformité\n| Exigence AI Act | Article / Annexe | Application au modèle | Statut |\n| --- | --- | --- | --- |\n| Documentation technique | Art. 53 | Application de test | Documenté |\n${recommendations}`,
    `## PARTIE 2 : Données\n${other}`,
    `## PARTIE 3 : Prompts\n${other}`,
    `## PARTIE 4 : Risques\n${other}`,
    `## PARTIE 5 : Surveillance\n${other}`,
  ].join('\n\n')
}

describe('découpage des piliers', () => {
  test('découpe une fiche au gabarit complet', () => {
    const parsed = parseSystemCardPillars(gabaritMarkdown('Documenté'))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.rule).toBe('partie')
    expect(parsed.pillars.map((pillar) => pillar.pillar_code)).toEqual([
      'doc_technique',
      'data_governance',
      'prompts_guardrails',
      'risk_management',
      'surveillance_plan',
    ])
    expect(parsed.pillars[0]?.pillar_title).toBe('Documentation Technique du Système (GPAI et Haut Risque)')
    expect(parsed.pillars[0]?.sections_covered).toBe('Documentation technique du système')
    expect(parsed.pillars[0]?.key_points).toEqual(['Point un', 'Point deux'])
    expect(parsed.pillars[0]?.ai_act_compliance[0]).toMatchObject({
      exigence: 'Documentation technique',
      article: 'Art. 53',
      status: 'DOCUMENTED',
      status_label: 'Documenté',
    })
    expect(parsed.pillars[0]?.recommendations.fournisseur).toBe('Tenir le dossier.')
    expect(parsed.unmappedLabels).toEqual([])
  })

  test('rattache le premier bloc à doc_technique sans PARTIE 1', () => {
    const parsed = parseSystemCardPillars(markdownWithoutPartOne())
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.rule).toBe('partie_without_1')
    expect(parsed.pillars).toHaveLength(5)
    expect(parsed.pillars[0]?.pillar_code).toBe('doc_technique')
    expect(parsed.pillars[0]?.sections_covered).toBe('Abstract, Model training and characteristics, Cyber evaluations')
  })

  test('reconnaît les cinq titres anglais', () => {
    const parsed = parseSystemCardPillars(englishMarkdown())
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.rule).toBe('english')
    expect(parsed.pillars.map((pillar) => pillar.sections_covered)).toEqual([
      'Technical Documentation',
      'Data Governance & Bias',
      'Prompts & Safeguards',
      'RSP & Risk Assessment',
      'Monitoring & Oversight',
    ])
    expect(parsed.pillars.map((pillar) => pillar.ai_act_compliance[0]?.status)).toEqual([
      'DOCUMENTED',
      'REFERENCED',
      'DOWNSTREAM',
      'NOT_PUBLISHED',
      'NOT_APPLICABLE',
    ])
  })

  test('échoue sans écrire de piliers quand le gabarit est absent', () => {
    const parsed = parseSystemCardPillars('# Seulement un titre\n\nTexte libre.')
    expect(parsed).toEqual({
      ok: false,
      error: 'Le markdown ne contient pas exactement cinq parties reconnues.',
    })
  })

  test('extrait les recommandations « Pour le / Pour l\' », y compris sur la ligne suivante', () => {
    const recommendations = [
      '### 4. Recommandations',
      '**Pour le Fournisseur :**',
      'Tenir le dossier',
      'et le compléter.',
      '**Pour l\'Intégrateur (Annexe XI):**',
      'Relier le système.',
      '- **Pour le Déployeur :** Surveiller',
      'l\'usage.',
    ].join('\n')
    const parsed = parseSystemCardPillars(partWithRecommendations(recommendations))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.pillars[0]?.recommendations).toEqual({
      fournisseur: 'Tenir le dossier et le compléter.',
      integrateur: 'Relier le système.',
      deployeur: 'Surveiller l\'usage.',
    })
  })

  test('extrait les recommandations « Si votre entreprise agit en tant que »', () => {
    const recommendations = [
      '### 4. Recommandations par Profil de l\'Entreprise Cliente',
      '* **Si votre entreprise agit en tant que Fournisseur :**',
      'Publier le résumé.',
      '* **Si votre entreprise agit en tant qu\'Intégrateur :** Isoler le bac à sable.',
      '* **Si votre entreprise agit en tant que Déployeur :**',
      'Former les équipes.',
    ].join('\n')
    const parsed = parseSystemCardPillars(partWithRecommendations(recommendations))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.pillars[0]?.recommendations).toEqual({
      fournisseur: 'Publier le résumé.',
      integrateur: 'Isoler le bac à sable.',
      deployeur: 'Former les équipes.',
    })
  })

  test('signale un libellé inconnu sans échouer le découpage', () => {
    const parsed = parseSystemCardPillars(auditedMarkdown('# Fiche', 'Formule libre'))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.unmappedLabels).toEqual([
      'Formule libre',
      'Formule libre',
      'Formule libre',
      'Formule libre',
      'Formule libre',
    ])
  })
})
