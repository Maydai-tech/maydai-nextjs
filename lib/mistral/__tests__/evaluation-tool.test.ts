import {
  SAVE_EVALUATION_NODES_TOOL_NAME,
  SAVE_SINGLE_ANSWER_TOOL_NAME,
  buildSaveEvaluationNodesTool,
  buildSaveSingleAnswerTool,
  contextualizeEvaluationQuestion,
  formatEvaluationCheckboxReply,
  formatEvaluationQuestionForChat,
  isAnnexDomainMismatchSelection,
  isStallingEvaluationMessage,
  parseEvaluationNodes,
  parseSingleAnswer,
  toggleEvaluationCheckboxCode,
} from '@/lib/mistral/evaluation-tool'

describe('save_evaluation_nodes tool schema', () => {
  test('expose les 4 champs requis et l’enum de rôle', () => {
    const tool = buildSaveEvaluationNodesTool()
    expect(tool.function.name).toBe(SAVE_EVALUATION_NODES_TOOL_NAME)
    const params = tool.function.parameters as {
      required: string[]
      properties: Record<string, { enum?: string[] }>
    }
    expect(params.required).toEqual([
      'role_deduit',
      'is_art5_interdit',
      'domaine_annexe3',
      'explication_courte',
    ])
    expect(params.properties.role_deduit.enum).toEqual([
      'fournisseur',
      'deployeur',
      'indetermine',
    ])
  })

  test('parseEvaluationNodes accepte un payload valide', () => {
    const data = parseEvaluationNodes({
      role_deduit: 'deployeur',
      is_art5_interdit: false,
      domaine_annexe3: 'Emploi',
      explication_courte: 'Outil RH utilisé tel quel, sans modification du modèle.',
    })
    expect(data?.role_deduit).toBe('deployeur')
    expect(data?.is_art5_interdit).toBe(false)
    expect(data?.domaine_annexe3).toBe('Emploi')
  })

  test('parseEvaluationNodes refuse un rôle inconnu', () => {
    expect(
      parseEvaluationNodes({
        role_deduit: 'utilisateur',
        is_art5_interdit: false,
        domaine_annexe3: 'Aucun',
        explication_courte: 'Test',
      })
    ).toBeNull()
  })
})

describe('save_single_answer tool schema', () => {
  test('expose question_id et selected_option_code', () => {
    const tool = buildSaveSingleAnswerTool()
    expect(tool.function.name).toBe(SAVE_SINGLE_ANSWER_TOOL_NAME)
    const params = tool.function.parameters as { required: string[] }
    expect(params.required).toEqual(['question_id', 'selected_option_code'])
  })

  test('parseSingleAnswer accepte un couple valide', () => {
    expect(
      parseSingleAnswer({
        question_id: 'E4.N8.Q9',
        selected_option_code: 'E4.N8.Q9.A',
      })
    ).toEqual({
      question_id: 'E4.N8.Q9',
      selected_option_code: 'E4.N8.Q9.A',
    })
  })
})

describe('isStallingEvaluationMessage', () => {
  test('détecte les messages d’attente qui bloquent le chat', () => {
    expect(
      isStallingEvaluationMessage(
        'Je vous tiens informé dès que c’est fait ! *(Cela prend quelques secondes.)*'
      )
    ).toBe(true)
    expect(isStallingEvaluationMessage('Le système prend-il des décisions seul ?')).toBe(false)
  })
})

describe('formatEvaluationQuestionForChat', () => {
  test('affiche l’énoncé et les options pour que le chat ne reste pas vide', () => {
    const text = formatEvaluationQuestionForChat({
      id: 'E4.N7.Q5',
      question: 'Le système prend-il des décisions sans intervention humaine significative ?',
      description: 'Garde-fou Article 6.3',
      type: 'radio',
      options: [
        { code: 'E4.N7.Q5.A', label: 'Oui' },
        { code: 'E4.N7.Q5.B', label: 'Non' },
      ],
    })
    expect(text).toContain('décisions sans intervention humaine')
    expect(text).toContain('• Oui')
    expect(text).toContain('• Non')
  })

  test('n’énumère pas les options du Persona Q1.2 (boutons Quick Reply côté UI)', () => {
    const text = formatEvaluationQuestionForChat({
      id: 'E4.N7.Q1.2',
      question: 'Quelle situation correspond le mieux à la vôtre ?',
      description: 'Adapte le ton du rapport',
      type: 'radio',
      options: [
        { code: 'E4.N7.Q1.2.C', label: 'Je suis le Data Protection Officer (DPO) de mon entreprise' },
        { code: 'E4.N7.Q1.2.D', label: 'Je suis avocat et souhaite apporter des réponses techniques à mes clients' },
      ],
    })
    expect(text).toContain('Quelle situation correspond le mieux')
    expect(text).not.toContain('• ')
    expect(text).not.toContain('DPO')
  })

  test('ajoute « Les deux » pour la question texte / médias', () => {
    const text = formatEvaluationQuestionForChat({
      id: 'E4.N8.Q11.1',
      question: 'Quels types de contenus sont concernés ? (vous pouvez cocher les deux)',
      description: 'Texte seul, médias seuls, ou les deux.',
      type: 'checkbox',
      options: [
        { code: 'E4.N8.Q11.1.A', label: 'Texte' },
        { code: 'E4.N8.Q11.1.B', label: 'Image, audio ou vidéo' },
      ],
    })
    expect(text).toContain('• Texte')
    expect(text).toContain('• Image, audio ou vidéo')
    expect(text).toContain('• Les deux')
  })
})

describe('toggleEvaluationCheckboxCode', () => {
  const question = {
    id: 'E4.N8.Q11.1',
    question: 'Quels types de contenus sont concernés ?',
    description: null,
    type: 'checkbox' as const,
    options: [
      { code: 'E4.N8.Q11.1.A', label: 'Texte' },
      { code: 'E4.N8.Q11.1.B', label: 'Image, audio ou vidéo' },
    ],
  }

  test('permet de cocher les deux options avant validation', () => {
    const afterText = toggleEvaluationCheckboxCode(question, [], 'E4.N8.Q11.1.A')
    expect(afterText).toEqual(['E4.N8.Q11.1.A'])
    expect(toggleEvaluationCheckboxCode(question, afterText, 'E4.N8.Q11.1.B')).toEqual([
      'E4.N8.Q11.1.A',
      'E4.N8.Q11.1.B',
    ])
  })

  test('formate « Les deux » quand les deux cases sont cochées', () => {
    expect(
      formatEvaluationCheckboxReply(question, ['E4.N8.Q11.1.A', 'E4.N8.Q11.1.B'])
    ).toBe('Les deux')
    expect(formatEvaluationCheckboxReply(question, ['E4.N8.Q11.1.A'])).toBe('Texte')
  })
})

describe('contextualizeEvaluationQuestion Q5', () => {
  test('nomme le domaine Emploi et propose de corriger un badge / sas', () => {
    const q5 = {
      id: 'E4.N7.Q5',
      question: 'Dans ce domaine sensible, l\'IA se limite-t-elle à vous aider ?',
      description: 'Domaines sensibles',
      type: 'radio' as const,
      options: [
        { code: 'E4.N7.Q5.A', label: 'Oui' },
        { code: 'E4.N7.Q5.B', label: 'Non' },
        { code: 'E4.N7.Q5.C', label: 'Je ne sais pas' },
      ],
    }
    const contextualized = contextualizeEvaluationQuestion(q5, {
      'E4.N7.Q2': ['E4.N7.Q2.A'],
    })
    expect(contextualized.question).toContain('Emploi, gestion des travailleurs')
    expect(contextualized.question).toContain('recruter')
    expect(contextualized.description).toContain('badge')
    expect(contextualized.options.map((option) => option.label)).toContain(
      'Cela ne correspond pas à ce domaine'
    )
  })

  test('ajoute un exemple concret à la gestion des risques (Q1)', () => {
    const q1 = {
      id: 'E5.N9.Q1',
      question: 'Avez-vous établi et maintenez-vous un système de gestion des risques ?',
      description: null,
      type: 'radio' as const,
      options: [
        { code: 'E5.N9.Q1.A', label: 'Oui' },
        { code: 'E5.N9.Q1.B', label: 'Non' },
      ],
    }
    const withName = contextualizeEvaluationQuestion(q1, {}, { name: 'Traducteur HTML' })
    expect(withName.description).toContain('Traducteur HTML')
    expect(withName.description).toContain('fiche ou un process vivant')
    expect(withName.description).toContain('on fait attention')

    const generic = contextualizeEvaluationQuestion(q1, {})
    expect(generic.description).toMatch(/^Exemple :/)
    expect(generic.description).not.toContain('Traducteur HTML')
  })

  test('isAnnexDomainMismatchSelection reconnaît un sas / badge', () => {
    expect(isAnnexDomainMismatchSelection('Cela ne correspond pas à ce domaine')).toBe(true)
    expect(isAnnexDomainMismatchSelection('c’est comme un badge')).toBe(true)
    expect(isAnnexDomainMismatchSelection('Non')).toBe(false)
  })
})
