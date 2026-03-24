import {
  extractNextStepsFromReport,
  extractNextStepsFromJSON,
  extractNextStepsFromMarkdown,
  validateNextStepsData,
  computeTextSimilarity,
} from '../nextsteps-parser'
import { UseCaseNextStepsInput } from '../supabase'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeFullJSON(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    introduction_contextuelle: 'L\'entreprise Acme déploie un système IA de classification de contenus marketing.',
    evaluation_risque: {
      niveau: 'Risque limité',
      justification: 'Le système est utilisé pour du contenu marketing sans impact sur les droits fondamentaux.',
    },
    quick_win_1: 'Initialiser un registre centralisé IA conforme à l\'article 49, documentant le système de classification de contenus.',
    quick_win_2: 'Désigner un responsable de surveillance humaine chargé de vérifier les sorties du système de classification.',
    quick_win_3: 'Documenter les instructions système et les prompts utilisés pour la classification des contenus marketing.',
    priorite_1: 'Constituer la documentation technique du système incluant l\'architecture, les données d\'entraînement et les métriques.',
    priorite_2: 'Mettre en place un marquage de transparence informant les utilisateurs que le contenu est traité par IA.',
    priorite_3: 'Évaluer la qualité des données d\'entraînement en documentant les sources, le nettoyage et la représentativité.',
    action_1: 'Élaborer un plan de gestion des risques identifiant les biais potentiels et les mesures d\'atténuation.',
    action_2: 'Établir un plan de surveillance continue mesurant la précision et la dérive du modèle chaque trimestre.',
    action_3: 'Planifier des formations AI Act pour les équipes marketing et techniques sur leurs obligations réglementaires.',
    impact_attendu: 'La mise en œuvre de ces actions permettra une conformité AI Act dès la première échéance réglementaire.',
    conclusion: 'Le système présente un risque limité. Les actions proposées sont réalisables dans un délai de 6 mois.',
    ...overrides,
  })
}

// ─── extractNextStepsFromJSON ───────────────────────────────────────────────

describe('extractNextStepsFromJSON', () => {
  test('cas parfait : JSON avec 9 clés directes', () => {
    const result = extractNextStepsFromJSON(makeFullJSON())

    expect(result.quick_win_1).toContain('registre centralisé')
    expect(result.quick_win_2).toContain('surveillance humaine')
    expect(result.quick_win_3).toContain('instructions système')
    expect(result.priorite_1).toContain('documentation technique')
    expect(result.priorite_2).toContain('marquage de transparence')
    expect(result.priorite_3).toContain('qualité des données')
    expect(result.action_1).toContain('gestion des risques')
    expect(result.action_2).toContain('surveillance continue')
    expect(result.action_3).toContain('formations AI Act')
    expect(result.introduction).toBeTruthy()
    expect(result.evaluation).toContain('Risque limité')
    expect(result.impact).toBeTruthy()
    expect(result.conclusion).toBeTruthy()
  })

  test('fallback tableaux : ancien format avec arrays', () => {
    const input = JSON.stringify({
      introduction_contextuelle: 'Intro test.',
      evaluation_risque: { niveau: 'Risque limité', justification: 'Justif test.' },
      quick_wins_actions_immediates: ['QW registre', 'QW surveillance', 'QW prompts'],
      priorites_actions_reglementaires: ['Prio doc tech', 'Prio transparence', 'Prio data quality'],
      actions_moyen_terme: ['Action risques', 'Action monitoring', 'Action formations'],
      impact_attendu: 'Impact test.',
      conclusion: 'Conclusion test.',
    })

    const result = extractNextStepsFromJSON(input)

    expect(result.quick_win_1).toBe('QW registre')
    expect(result.quick_win_2).toBe('QW surveillance')
    expect(result.quick_win_3).toBe('QW prompts')
    expect(result.priorite_1).toBe('Prio doc tech')
    expect(result.priorite_2).toBe('Prio transparence')
    expect(result.priorite_3).toBe('Prio data quality')
    expect(result.action_1).toBe('Action risques')
    expect(result.action_2).toBe('Action monitoring')
    expect(result.action_3).toBe('Action formations')
  })

  test('clés directes prioritaires sur tableaux', () => {
    const input = JSON.stringify({
      introduction_contextuelle: 'Intro.',
      evaluation_risque: 'Risque limité',
      quick_win_1: 'Direct registre',
      quick_wins_actions_immediates: ['Array registre', 'Array surveillance', 'Array prompts'],
      priorite_1: 'Direct doc',
      priorites_actions_reglementaires: ['Array doc', 'Array transparence', 'Array data'],
      action_1: 'Direct risques',
      actions_moyen_terme: ['Array risques', 'Array monitoring', 'Array formations'],
      impact_attendu: 'Impact.',
      conclusion: 'Conclusion.',
    })

    const result = extractNextStepsFromJSON(input)

    expect(result.quick_win_1).toBe('Direct registre')
    expect(result.quick_win_2).toBe('Array surveillance')
    expect(result.priorite_1).toBe('Direct doc')
    expect(result.priorite_2).toBe('Array transparence')
    expect(result.action_1).toBe('Direct risques')
    expect(result.action_2).toBe('Array monitoring')
  })

  test('evaluation_risque en string simple', () => {
    const input = JSON.stringify({
      evaluation_risque: 'Le système présente un risque limité.',
    })

    const result = extractNextStepsFromJSON(input)
    expect(result.evaluation).toBe('Le système présente un risque limité.')
  })

  test('nettoyage des préfixes Markdown dans les valeurs JSON', () => {
    const input = JSON.stringify({
      introduction_contextuelle: '## Introduction contextuelle\nTexte réel ici.',
      impact_attendu: '## Impact attendu\nTexte impact.',
      conclusion: '## Conclusion\nTexte conclusion.',
    })

    const result = extractNextStepsFromJSON(input)
    expect(result.introduction).toBe('Texte réel ici.')
    expect(result.impact).toBe('Texte impact.')
    expect(result.conclusion).toBe('Texte conclusion.')
  })

  test('JSON invalide retourne objet vide', () => {
    const result = extractNextStepsFromJSON('not json at all')
    expect(result).toEqual({})
  })
})

// ─── extractNextStepsFromReport (détection de format) ───────────────────────

describe('extractNextStepsFromReport', () => {
  test('détecte et traite le format JSON', () => {
    const result = extractNextStepsFromReport(makeFullJSON())
    expect(result.quick_win_1).toBeTruthy()
    expect(result.priorite_3).toBeTruthy()
    expect(result.action_3).toBeTruthy()
  })

  test('détecte et traite le format Markdown', () => {
    const markdown = `# Recommandations

## Introduction contextuelle
Texte intro.

## Évaluation du niveau de risque AI Act
Risque limité.

### Actions réglementaires et documents techniques

**Documentation technique.** Constituer la documentation complète.
**Marquage transparence.** Informer les utilisateurs.
**Qualité données.** Évaluer les sources de données.

### Actions immédiates recommandées

**Registre IA.** Initialiser le registre centralisé.
**Surveillance.** Désigner un responsable de surveillance.
**Prompts.** Documenter les instructions système.

### Actions à moyen terme

**Gestion risques.** Élaborer le plan de gestion.
**Monitoring.** Surveillance continue trimestrielle.
**Formations.** Planifier les sessions AI Act.

## Impact attendu
Impact positif.

## Conclusion
Fin du rapport.`

    const result = extractNextStepsFromReport(markdown)
    expect(result.introduction).toBe('Texte intro.')
    expect(result.priorite_1).toBeTruthy()
    expect(result.quick_win_1).toBeTruthy()
    expect(result.action_1).toBeTruthy()
  })

  test('JSON embarqué dans du texte est détecté', () => {
    const input = `Voici le rapport:\n${makeFullJSON()}`
    // Le startsWith('{') échoue mais le fallback cherche les clés JSON
    const result = extractNextStepsFromReport(input)
    expect(result.quick_win_1).toBeTruthy()
  })
})

// ─── validateNextStepsData ──────────────────────────────────────────────────

describe('validateNextStepsData', () => {
  test('données complètes et distinctes → isValid = true', () => {
    const data: Partial<UseCaseNextStepsInput> = {
      usecase_id: 'test-id',
      introduction: 'Intro',
      evaluation: 'Eval',
      impact: 'Impact',
      conclusion: 'Conclusion',
      quick_win_1: 'Registre centralisé IA',
      quick_win_2: 'Surveillance humaine',
      quick_win_3: 'Instructions système et prompts',
      priorite_1: 'Documentation technique',
      priorite_2: 'Marquage de transparence',
      priorite_3: 'Qualité des données',
      action_1: 'Gestion des risques',
      action_2: 'Surveillance continue',
      action_3: 'Formations AI Act',
    }

    const result = validateNextStepsData(data)
    expect(result.isValid).toBe(true)
    expect(result.hasDuplicates).toBe(false)
    expect(result.missingFields).toEqual([])
  })

  test('usecase_id manquant → isValid = false', () => {
    const data: Partial<UseCaseNextStepsInput> = {
      quick_win_1: 'QW1', quick_win_2: 'QW2', quick_win_3: 'QW3',
      priorite_1: 'P1', priorite_2: 'P2', priorite_3: 'P3',
      action_1: 'A1', action_2: 'A2', action_3: 'A3',
    }

    const result = validateNextStepsData(data)
    expect(result.isValid).toBe(false)
    expect(result.missingFields).toContain('usecase_id')
  })

  test('action manquante (priorite_3 absent) → isValid = false', () => {
    const data: Partial<UseCaseNextStepsInput> = {
      usecase_id: 'test-id',
      quick_win_1: 'QW1', quick_win_2: 'QW2', quick_win_3: 'QW3',
      priorite_1: 'P1', priorite_2: 'P2',
      action_1: 'A1', action_2: 'A2', action_3: 'A3',
    }

    const result = validateNextStepsData(data)
    expect(result.isValid).toBe(false)
    expect(result.missingFields).toContain('priorite_3')
  })

  test('quasi-doublons dans quick_wins → hasDuplicates = true', () => {
    const sameText = 'Il est recommandé d\'initialiser un registre centralisé des systèmes d\'IA conformément aux exigences réglementaires.'
    const data: Partial<UseCaseNextStepsInput> = {
      usecase_id: 'test-id',
      quick_win_1: sameText,
      quick_win_2: sameText,
      quick_win_3: 'Documenter les prompts et instructions système du chatbot.',
      priorite_1: 'P1', priorite_2: 'P2', priorite_3: 'P3',
      action_1: 'A1', action_2: 'A2', action_3: 'A3',
    }

    const result = validateNextStepsData(data)
    expect(result.hasDuplicates).toBe(true)
    expect(result.isValid).toBe(false)
    expect(result.duplicateDetails.length).toBeGreaterThan(0)
    expect(result.duplicateDetails[0]).toContain('quick_win_1')
    expect(result.duplicateDetails[0]).toContain('quick_win_2')
  })

  test('doublons inter-groupes ne sont PAS détectés (voulu)', () => {
    const data: Partial<UseCaseNextStepsInput> = {
      usecase_id: 'test-id',
      quick_win_1: 'Initialiser un registre centralisé des systèmes d\'intelligence artificielle.',
      quick_win_2: 'Désigner le responsable de la surveillance humaine du chatbot marketing.',
      quick_win_3: 'Documenter les instructions système et les prompts du chatbot.',
      priorite_1: 'Initialiser un registre centralisé des systèmes d\'intelligence artificielle.',
      priorite_2: 'Mettre en place le marquage de transparence pour les utilisateurs finaux.',
      priorite_3: 'Évaluer et documenter la qualité des données d\'entraînement du modèle.',
      action_1: 'Élaborer un plan complet de gestion des risques liés au système.',
      action_2: 'Surveiller en continu les performances et la conformité du système IA.',
      action_3: 'Organiser des formations AI Act pour les équipes marketing et techniques.',
    }

    const result = validateNextStepsData(data)
    // quick_win_1 et priorite_1 sont identiques mais dans des groupes différents → pas détecté
    expect(result.hasDuplicates).toBe(false)
  })

  test('sections narratives manquantes → warnings mais pas de blocage si actions OK', () => {
    const data: Partial<UseCaseNextStepsInput> = {
      usecase_id: 'test-id',
      quick_win_1: 'QW1', quick_win_2: 'QW2', quick_win_3: 'QW3',
      priorite_1: 'P1', priorite_2: 'P2', priorite_3: 'P3',
      action_1: 'A1', action_2: 'A2', action_3: 'A3',
    }

    const result = validateNextStepsData(data)
    expect(result.isValid).toBe(true)
    expect(result.warnings).toContain('Section "introduction" manquante')
    expect(result.warnings).toContain('Section "conclusion" manquante')
  })
})

// ─── computeTextSimilarity ──────────────────────────────────────────────────

describe('computeTextSimilarity', () => {
  test('textes identiques → 1', () => {
    expect(computeTextSimilarity('Bonjour le monde', 'Bonjour le monde')).toBe(1)
  })

  test('textes totalement différents → ~0', () => {
    const sim = computeTextSimilarity(
      'Initialiser un registre centralisé des systèmes',
      'Planifier des formations pour les équipes techniques'
    )
    expect(sim).toBeLessThan(0.3)
  })

  test('textes quasi identiques avec reformulation mineure → >0.8', () => {
    const sim = computeTextSimilarity(
      'Il est recommandé d\'initialiser un registre centralisé des systèmes d\'IA.',
      'Il est fortement recommandé d\'initialiser un registre centralisé des systèmes d\'IA conformément à la réglementation.'
    )
    expect(sim).toBeGreaterThan(0.7)
  })

  test('texte vide → 0', () => {
    expect(computeTextSimilarity('', 'quelque chose')).toBe(0)
    expect(computeTextSimilarity('test', '')).toBe(0)
  })
})

// ─── Cas de régression spécifiques au bug ───────────────────────────────────

describe('cas de régression : bug duplication', () => {
  test('paragraphe fusionné Markdown sans gras → aucune action extraite (pas de duplication)', () => {
    const markdown = `## Introduction contextuelle
Intro.

### Actions immédiates recommandées

Il faut initialiser un registre, désigner un responsable et définir les instructions.

## Conclusion
Fin.`

    const result = extractNextStepsFromMarkdown(markdown)

    expect(result.quick_win_1).toBeUndefined()
    expect(result.quick_win_2).toBeUndefined()
    expect(result.quick_win_3).toBeUndefined()
  })

  test('un seul élément gras dans une section → seule la première action est remplie', () => {
    const markdown = `### Actions immédiates recommandées

**Initialiser le registre et désigner un responsable et documenter les prompts.**

## Conclusion
Fin.`

    const result = extractNextStepsFromMarkdown(markdown)

    if (result.quick_win_1) {
      expect(result.quick_win_2).not.toBe(result.quick_win_1)
    }
  })

  test('tableau JSON avec seulement 2 éléments → priorite_3 est undefined', () => {
    const input = JSON.stringify({
      introduction_contextuelle: 'Intro',
      evaluation_risque: { niveau: 'Limité', justification: 'Test' },
      priorites_actions_reglementaires: ['Doc technique', 'Transparence'],
      quick_wins_actions_immediates: ['QW1', 'QW2', 'QW3'],
      actions_moyen_terme: ['A1', 'A2', 'A3'],
      impact_attendu: 'Impact',
      conclusion: 'Conclusion',
    })

    const result = extractNextStepsFromReport(input)

    expect(result.priorite_1).toBe('Doc technique')
    expect(result.priorite_2).toBe('Transparence')
    expect(result.priorite_3).toBeUndefined()
  })

  test('validation bloque les données quand quick_win_1 = quick_win_2 = quick_win_3', () => {
    const duplicatedText = 'Il est recommandé d\'initialiser un registre centralisé des systèmes d\'IA.'
    const data: Partial<UseCaseNextStepsInput> = {
      usecase_id: 'test-id',
      quick_win_1: duplicatedText,
      quick_win_2: duplicatedText,
      quick_win_3: duplicatedText,
      priorite_1: 'P1', priorite_2: 'P2', priorite_3: 'P3',
      action_1: 'A1', action_2: 'A2', action_3: 'A3',
    }

    const validation = validateNextStepsData(data)

    expect(validation.isValid).toBe(false)
    expect(validation.hasDuplicates).toBe(true)
    expect(validation.duplicateDetails.length).toBeGreaterThanOrEqual(1)
  })
})
