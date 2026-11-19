import {
  resolveNextEvaluationStep,
  resolveOptionCodeForQuestion,
  resolveOptionCodesForQuestion,
  toEvaluationQuestionNode,
} from '@/lib/mistral/evaluation-graph-orchestrator'
import { mapEvaluationNodesToAnswers } from '@/lib/mistral/map-evaluation-nodes'

function withPersona(
  answers: Record<string, string | string[]>,
  persona = 'E4.N7.Q1.2.A'
): Record<string, string | string[]> {
  return { ...answers, 'E4.N7.Q1.2': persona }
}

describe('resolveNextEvaluationStep', () => {
  test('après nœuds déployeur, le graphe pose le Persona Q1.2 avant la suite', () => {
    const answers = mapEvaluationNodesToAnswers({
      role_deduit: 'deployeur',
      is_art5_interdit: false,
      domaine_annexe3: 'Emploi',
      explication_courte: 'RH',
    })
    expect(answers['E4.N7.Q1.2']).toBeUndefined()
    const step = resolveNextEvaluationStep(answers, 'Système autonome', 'long')
    expect(step.type).toBe('question')
    if (step.type !== 'question') return
    expect(step.question.id).toBe('E4.N7.Q1.2')
  })

  test('après nœuds déployeur + emploi, le graphe long pose Q5 (garde-fou 6.3)', () => {
    const answers = withPersona(
      mapEvaluationNodesToAnswers({
        role_deduit: 'deployeur',
        is_art5_interdit: false,
        domaine_annexe3: 'Emploi',
        explication_courte: 'RH',
      })
    )
    const step = resolveNextEvaluationStep(answers, 'Système autonome', 'long')
    expect(step.type).toBe('question')
    if (step.type !== 'question') return
    expect(step.question.id).toBe('E4.N7.Q5')
    expect(step.engineInstruction).toContain('save_single_answer')
    expect(step.question.options.length).toBeGreaterThan(0)
  })

  test('Q5 rappelle le domaine Emploi et propose de le corriger', () => {
    const answers = withPersona(
      mapEvaluationNodesToAnswers({
        role_deduit: 'deployeur',
        is_art5_interdit: false,
        domaine_annexe3: 'Emploi',
        explication_courte: 'RH',
      })
    )
    const step = resolveNextEvaluationStep(answers, 'Système autonome', 'long')
    expect(step.type).toBe('question')
    if (step.type !== 'question') return
    expect(step.question.question).toContain('Emploi, gestion des travailleurs')
    expect(step.question.options.some((option) => option.label.includes('ne correspond pas'))).toBe(
      true
    )
  })

  test('après nœuds + Aucun domaine, le graphe long pose Q9 (interaction)', () => {
    const answers = withPersona(
      mapEvaluationNodesToAnswers({
        role_deduit: 'deployeur',
        is_art5_interdit: false,
        domaine_annexe3: 'Aucun',
        explication_courte: 'Outil interne',
      })
    )
    const step = resolveNextEvaluationStep(answers, 'Système autonome', 'long')
    expect(step.type).toBe('question')
    if (step.type !== 'question') return
    expect(step.question.id).toBe('E4.N8.Q9')
  })

  test('sans réponse Q1, le graphe commence par le rôle', () => {
    const step = resolveNextEvaluationStep({}, null, 'long')
    expect(step.type).toBe('question')
    if (step.type !== 'question') return
    expect(step.question.id).toBe('E4.N7.Q1')
  })

  test('une question Oui/Non simple expose un exemple concret', () => {
    const answers = {
      ...withPersona(
        mapEvaluationNodesToAnswers({
          role_deduit: 'deployeur',
          is_art5_interdit: false,
          domaine_annexe3: 'Aucun',
          explication_courte: 'Traduction HTML',
        })
      ),
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q10': 'E4.N8.Q10.B',
      'E4.N8.Q12': 'E4.N8.Q12.B',
      'E5.N9.Q5': ['E5.N9.Q5.A'],
      'E5.N9.Q6': 'E5.N9.Q6.B',
    }
    const step = resolveNextEvaluationStep(answers, 'Système autonome', 'long', {
      name: 'Traducteur HTML',
    })
    expect(step.type).toBe('question')
    if (step.type !== 'question') return
    expect(step.question.id).toBe('E5.N9.Q1')
    expect(step.question.description).toContain('Traducteur HTML')
    expect(step.question.description).toContain('process vivant')
  })
})

describe('resolveOptionCodeForQuestion', () => {
  const q5 = toEvaluationQuestionNode('E4.N7.Q5')
  if (!q5) throw new Error('Q5 manquante')

  test('accepte le code catalogue et le libellé « Non »', () => {
    expect(resolveOptionCodeForQuestion(q5, 'E4.N7.Q5.B')).toBe('E4.N7.Q5.B')
    expect(resolveOptionCodeForQuestion(q5, 'Non')).toBe('E4.N7.Q5.B')
    expect(resolveOptionCodeForQuestion(q5, 'oui')).toBe('E4.N7.Q5.A')
    expect(resolveOptionCodeForQuestion(q5, 'Je ne sais pas')).toBe('E4.N7.Q5.C')
  })

  test('relie un code d’une autre question Oui/Non via le suffixe', () => {
    expect(resolveOptionCodeForQuestion(q5, 'E4.N7.Q4.B')).toBe('E4.N7.Q5.B')
  })

  test('relie « non » au libellé allongé de Q9', () => {
    const q9 = toEvaluationQuestionNode('E4.N8.Q9')
    if (!q9) throw new Error('Q9 manquante')
    expect(resolveOptionCodeForQuestion(q9, 'non')).toBe('E4.N8.Q9.B')
    expect(resolveOptionCodeForQuestion(q9, 'Non.')).toBe('E4.N8.Q9.B')
    expect(resolveOptionCodeForQuestion(q9, 'Oui')).toBe('E4.N8.Q9.A')
    expect(resolveOptionCodeForQuestion(q9, 'Non (Outil logiciel évident)')).toBe('E4.N8.Q9.B')
    expect(resolveOptionCodeForQuestion(q9, 'non, c’est un outil interne')).toBe('E4.N8.Q9.B')
  })

  test('ignore le préfixe numéroté « 1. Non, … »', () => {
    expect(
      resolveOptionCodeForQuestion(q5, '1. Non, on utilise GPT-5.3 sans modification.')
    ).toBe('E4.N7.Q5.B')
  })

  test('distingue « Non applicable » de « Non » sur l’étiquetage Art. 50.4', () => {
    const q3 = toEvaluationQuestionNode('E6.N10.Q3')
    if (!q3) throw new Error('E6.N10.Q3 manquante')
    expect(resolveOptionCodeForQuestion(q3, 'Non')).toBe('E6.N10.Q3.A')
    expect(resolveOptionCodeForQuestion(q3, 'Oui')).toBe('E6.N10.Q3.B')
    expect(
      resolveOptionCodeForQuestion(q3, 'Non applicable - Usage interne ou contenu exempté')
    ).toBe('E6.N10.Q3.C')
    expect(
      resolveOptionCodeForQuestion(q3, '• Non applicable - Usage interne ou contenu exempté')
    ).toBe('E6.N10.Q3.C')
  })
})

describe('resolveOptionCodesForQuestion', () => {
  const q111 = toEvaluationQuestionNode('E4.N8.Q11.1')
  if (!q111) throw new Error('Q11.1 manquante')

  test('mappe « Les deux » vers texte et médias', () => {
    expect(resolveOptionCodesForQuestion(q111, 'Les deux')).toEqual([
      'E4.N8.Q11.1.A',
      'E4.N8.Q11.1.B',
    ])
  })

  test('mappe les deux libellés séparés par un point-virgule', () => {
    expect(
      resolveOptionCodesForQuestion(q111, 'Texte ; Image, audio ou vidéo')
    ).toEqual(['E4.N8.Q11.1.A', 'E4.N8.Q11.1.B'])
  })

  test('garde une seule case si l’utilisateur ne choisit que le texte', () => {
    expect(resolveOptionCodesForQuestion(q111, 'Texte')).toEqual(['E4.N8.Q11.1.A'])
  })
})
