/** @jest-environment node */

import { matchComplAiModelId } from '../match-primary-model'

const MODEL_ID = '770e8400-e29b-41d4-a716-446655440000'

function createIlikeChain(result: { data: { id: string } | null; error: { message: string } | null }) {
  return {
    select: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  }
}

describe('matchComplAiModelId', () => {
  test('retourne l’id si le nom correspond exactement (ILIKE)', async () => {
    const exact = createIlikeChain({ data: { id: MODEL_ID }, error: null })
    const supabase = {
      from: jest.fn(() => exact),
    }

    const id = await matchComplAiModelId(supabase as never, 'Mistral Large')
    expect(id).toBe(MODEL_ID)
    expect(exact.ilike).toHaveBeenCalledWith('model_name', 'Mistral Large')
  })

  test('fait une recherche partielle si l’exact échoue', async () => {
    const exact = createIlikeChain({ data: null, error: null })
    const fuzzy = createIlikeChain({ data: { id: MODEL_ID }, error: null })
    const supabase = {
      from: jest.fn().mockReturnValueOnce(exact).mockReturnValueOnce(fuzzy),
    }

    const id = await matchComplAiModelId(supabase as never, 'GPT-4')
    expect(id).toBe(MODEL_ID)
    expect(fuzzy.ilike).toHaveBeenCalledWith('model_name', '%GPT-4%')
  })

  test('retourne null si aucun modèle ne correspond', async () => {
    const empty = createIlikeChain({ data: null, error: null })
    const supabase = {
      from: jest.fn().mockReturnValue(empty),
    }

    await expect(matchComplAiModelId(supabase as never, 'Modèle inventé')).resolves.toBeNull()
  })
})
