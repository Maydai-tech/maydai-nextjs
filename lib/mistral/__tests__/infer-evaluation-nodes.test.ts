import {
  extractNumberedReplyItems,
  inferInitialEvaluationNodesFromReply,
} from '@/lib/mistral/infer-evaluation-nodes'

describe('extractNumberedReplyItems', () => {
  test('découpe une réponse 1. 2. 3. sans casser GPT-5.3', () => {
    expect(
      extractNumberedReplyItems(
        '1. Non, on utilise GPT-5.3 sans modification. 2. Non à tout. 3. Non, c’est juste du marketing.'
      )
    ).toEqual([
      'Non, on utilise GPT-5.3 sans modification',
      'Non à tout',
      'Non, c’est juste du marketing',
    ])
  })
})

describe('inferInitialEvaluationNodesFromReply', () => {
  test('déduit déployeur, pas d’Art. 5, Aucun domaine pour une réponse groupée marketing', () => {
    const nodes = inferInitialEvaluationNodesFromReply(
      '1. Non, on utilise GPT-5.3 sans modification. 2. Non à tout. 3. Non, c’est juste du marketing.'
    )
    expect(nodes).toEqual({
      role_deduit: 'deployeur',
      is_art5_interdit: false,
      domaine_annexe3: 'Aucun',
      explication_courte:
        'Non, on utilise GPT-5.3 sans modification Non à tout Non, c’est juste du marketing',
    })
  })

  test('ne déduit rien d’un message sans liste numérotée', () => {
    expect(inferInitialEvaluationNodesFromReply('On utilise GPT-5.3 sans modification.')).toBeNull()
  })
})
