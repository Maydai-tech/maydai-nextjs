import {
  buildResumedEvaluationMessages,
  formatUsecaseRecapForWelcome,
  parseStoredEvaluationMessages,
  serializeStoredEvaluationMessages,
  welcomeEvaluationMessage,
} from '../evaluation-chat-session'
import { formatEvaluationQuestionForChat } from '../evaluation-tool'

const question = {
  id: 'E4.N7.Q5',
  question: 'Le système prend-il des décisions sans intervention humaine significative ?',
  description: null,
  type: 'radio' as const,
  options: [
    { code: 'E4.N7.Q5.A', label: 'Oui' },
    { code: 'E4.N7.Q5.B', label: 'Non' },
  ],
}

describe('evaluation-chat-session', () => {
  test('parseStoredEvaluationMessages ignore un JSON invalide', () => {
    expect(parseStoredEvaluationMessages('not-json')).toBeNull()
    expect(parseStoredEvaluationMessages('[]')).toBeNull()
  })

  test('serialize puis parse conserve les messages visibles', () => {
    const raw = serializeStoredEvaluationMessages([
      { id: '1', role: 'assistant', content: 'Bonjour' },
      { id: '2', role: 'system', content: 'secret' },
      { id: '3', role: 'user', content: 'On trie des CV' },
    ])
    expect(parseStoredEvaluationMessages(raw)).toEqual([
      { id: '1', role: 'assistant', content: 'Bonjour' },
      { id: '3', role: 'user', content: 'On trie des CV' },
    ])
  })

  test('sans réponses, reprend le message d’accueil', () => {
    const result = buildResumedEvaluationMessages({
      stored: null,
      industryLabel: 'Tech, Data & Télécoms',
      name: 'Traducteur HTML',
      description:
        'L’objectif principal est de traduire automatiquement des contenus web en HTML standardisé. À noter : La France est membre de l’Union européenne.',
      step: { type: 'not_started' },
    })
    expect(result.pathComplete).toBe(false)
    expect(result.messages[0]?.content).toBe(
      welcomeEvaluationMessage({
        industryLabel: 'Tech, Data & Télécoms',
        name: 'Traducteur HTML',
        description:
          'L’objectif principal est de traduire automatiquement des contenus web en HTML standardisé. À noter : La France est membre de l’Union européenne.',
      })
    )
    expect(result.messages[0]?.content).toContain('Traducteur HTML')
    expect(result.messages[0]?.content).toContain('page d’origine')
    expect(result.messages[0]?.content).not.toContain(
      "Pourriez-vous m'expliquer concrètement comment les utilisateurs finaux vont interagir"
    )
  })

  test('avec réponses en base, reprend à la question en cours sans réafficher l’accueil', () => {
    const result = buildResumedEvaluationMessages({
      stored: null,
      industryLabel: 'Tech, Data & Télécoms',
      step: { type: 'question', question },
    })
    expect(result.messages.map((message) => message.content)).toEqual([
      'Nous reprenons l’évaluation là où vous vous êtes arrêté.',
      formatEvaluationQuestionForChat(question),
    ])
  })

  test('conserve l’historique local et ajoute la question si elle n’y est pas déjà', () => {
    const stored = [
      { id: '1', role: 'assistant' as const, content: 'Bonjour' },
      { id: '2', role: 'user' as const, content: 'On trie des CV' },
    ]
    const result = buildResumedEvaluationMessages({
      stored,
      industryLabel: 'Tech',
      step: { type: 'question', question },
    })
    expect(result.messages).toHaveLength(3)
    expect(result.messages[2]?.content).toBe(formatEvaluationQuestionForChat(question))
  })

  test('ne dump pas le Persona Q1.2 dans l’historique (Quick Replies côté UI)', () => {
    const personaQuestion = {
      id: 'E4.N7.Q1.2',
      question: 'Quelle situation correspond le mieux à la vôtre ?',
      description: 'Adapte le ton',
      type: 'radio' as const,
      options: [
        { code: 'E4.N7.Q1.2.A', label: 'Utilisateur métier' },
        { code: 'E4.N7.Q1.2.C', label: 'DPO' },
      ],
    }
    const stored = [
      { id: '1', role: 'assistant' as const, content: 'Bonjour' },
      { id: '2', role: 'user' as const, content: 'On ouvre une porte' },
    ]
    const result = buildResumedEvaluationMessages({
      stored,
      industryLabel: 'Tech',
      step: { type: 'question', question: personaQuestion },
    })
    expect(result.messages).toEqual(stored)
    expect(result.messages.some((message) => message.content.includes('DPO'))).toBe(false)
  })

  test('remplace l’ancien accueil générique stocké localement', () => {
    const result = buildResumedEvaluationMessages({
      stored: [
        {
          id: 'welcome',
          role: 'assistant',
          content:
            "Bonjour ! J'ai bien noté que vous travaillez dans le secteur Tech, Data & Télécoms. Pourriez-vous m'expliquer concrètement comment les utilisateurs finaux vont interagir avec cette IA ?",
        },
      ],
      industryLabel: 'Tech, Data & Télécoms',
      name: 'Traducteur HTML',
      description: 'L’objectif principal est de traduire automatiquement des contenus web en HTML.',
      step: { type: 'not_started' },
    })
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0]?.content).toContain('Traducteur HTML')
    expect(result.messages[0]?.content).not.toContain(
      "Pourriez-vous m'expliquer concrètement comment les utilisateurs finaux vont interagir"
    )
  })
})

describe('formatUsecaseRecapForWelcome', () => {
  test('extrait l’objectif et retire le boilerplate AI Act', () => {
    expect(
      formatUsecaseRecapForWelcome(
        'Registre MaydAI SAS a défini un cas d’usage. L’objectif principal est de traduire automatiquement des contenus web en HTML standardisé. À noter : La France est membre de l’Union européenne, ce qui implique que ce cas d’usage est soumis à l’AI Act.'
      )
    ).toBe('L’objectif principal est de traduire automatiquement des contenus web en HTML standardisé.')
  })
})
