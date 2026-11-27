import type { SupabaseClient } from '@supabase/supabase-js'

import {
  EcologitsLinkUpdateError,
  ignoreEcologitsModel,
  matchEcologitsModel,
  unignoreEcologitsModel,
  unlinkEcologitsModel,
} from '@/lib/ecologits/link-actions'
import {
  buildEcologitsEstimateSummary,
  EcologitsPutLinkBodySchema,
  formatEcologitsArchitecture,
} from '@/types/ecologits.zod'

const ECO_ID = '13528f85-7893-494a-8c67-511bda8fc813'
const MAYDAI_ID = 'c4ebe815-b69b-4da2-b366-20dce7349782'
const OTHER_A = '11111111-1111-4111-8111-111111111111'
const OTHER_B = '22222222-2222-4222-8222-222222222222'
const NEW_ECO = '33333333-3333-4333-8333-333333333333'

type EcoRecord = {
  id: string
  provider: string
  name: string
  normalized_name: string
  link_status: string
}

type LinkRow = { ecologits_model_id: string; maydai_model_id: string; match_method: string }
type AliasRow = {
  model_id: string
  source: string
  source_id: string
  raw_name: string
  normalized_name: string
  match_method: string
}

function createStore() {
  const eco: EcoRecord = {
    id: ECO_ID,
    provider: 'google',
    name: 'gemini-3.1-flash-image-preview',
    normalized_name: 'gemini31flashimagepreview',
    link_status: 'unmatched',
  }
  return {
    eco,
    ecos: [eco] as EcoRecord[],
    maydaiIds: new Set([MAYDAI_ID]),
    links: [
      { ecologits_model_id: ECO_ID, maydai_model_id: '15a9f2c7-b229-4e55-aa41-d643f3177aeb', match_method: 'exact' },
    ] as LinkRow[],
    aliases: [
      {
        model_id: '15a9f2c7-b229-4e55-aa41-d643f3177aeb',
        source: 'ecologits',
        source_id: ECO_ID,
        raw_name: 'gemini-3.1-flash-image-preview',
        normalized_name: 'gemini31flashimagepreview',
        match_method: 'exact',
      },
      {
        model_id: MAYDAI_ID,
        source: 'llm_stats',
        source_id: 'mistral-medium-3',
        raw_name: 'mistral-medium-3',
        normalized_name: 'mistral-medium-3',
        match_method: 'manual',
      },
    ] as AliasRow[],
  }
}

function createClient(store: ReturnType<typeof createStore>): SupabaseClient {
  function from(table: string) {
    let operation = 'select'
    let payload: Record<string, unknown> | null = null
    const filters: Array<{ column: string; value: unknown; op: 'eq' | 'neq' }> = []

    const run = () => {
      if (table === 'ecologits_models' && operation === 'select') {
        const id = filters.find((filter) => filter.column === 'id' && filter.op === 'eq')?.value
        return { data: store.ecos.find((eco) => eco.id === id) ?? null, error: null }
      }
      if (table === 'compl_ai_models' && operation === 'select') {
        const id = filters.find((filter) => filter.column === 'id' && filter.op === 'eq')?.value
        return { data: store.maydaiIds.has(String(id)) ? { id } : null, error: null }
      }
      if (table === 'ecologits_model_links' && operation === 'select') {
        const maydai = filters.find((filter) => filter.column === 'maydai_model_id')?.value
        const excluded = filters.find((filter) => filter.op === 'neq')?.value
        const rows = store.links
          .filter((link) => (maydai == null || link.maydai_model_id === maydai) && link.ecologits_model_id !== excluded)
          .map((link) => {
            const eco = store.ecos.find((item) => item.id === link.ecologits_model_id)
            return {
              ecologits_model_id: link.ecologits_model_id,
              maydai_model_id: link.maydai_model_id,
              eco: eco ? { provider: eco.provider, name: eco.name, link_status: eco.link_status } : null,
            }
          })
        return { data: rows, error: null }
      }
      if (table === 'ecologits_model_links' && operation === 'delete') {
        const id = filters.find((filter) => filter.column === 'ecologits_model_id')?.value
        store.links = store.links.filter((link) => link.ecologits_model_id !== id)
        return { data: null, error: null }
      }
      if (table === 'ecologits_model_links' && operation === 'insert' && payload) {
        store.links.push({
          ecologits_model_id: String(payload.ecologits_model_id),
          maydai_model_id: String(payload.maydai_model_id),
          match_method: String(payload.match_method),
        })
        return { data: null, error: null }
      }
      if (table === 'llm_model_aliases' && operation === 'delete') {
        const source = filters.find((filter) => filter.column === 'source')?.value
        const sourceId = filters.find((filter) => filter.column === 'source_id')?.value
        const rawName = filters.find((filter) => filter.column === 'raw_name')?.value
        store.aliases = store.aliases.filter((alias) => {
          if (alias.source !== source) return true
          if (sourceId != null) return alias.source_id !== sourceId
          if (rawName != null) return alias.raw_name !== rawName
          return true
        })
        return { data: null, error: null }
      }
      if (table === 'llm_model_aliases' && operation === 'insert' && payload) {
        store.aliases.push({
          model_id: String(payload.model_id),
          source: String(payload.source),
          source_id: String(payload.source_id),
          raw_name: String(payload.raw_name),
          normalized_name: String(payload.normalized_name),
          match_method: String(payload.match_method),
        })
        return { data: null, error: null }
      }
      if (table === 'ecologits_models' && operation === 'update' && payload) {
        const id = filters.find((filter) => filter.column === 'id' && filter.op === 'eq')?.value
        const target = store.ecos.find((eco) => eco.id === id)
        if (target && typeof payload.link_status === 'string') target.link_status = payload.link_status
        return { data: null, error: null }
      }
      return { data: null, error: null }
    }

    const builder = {
      select() { return builder },
      eq(column: string, value: unknown) {
        filters.push({ column, value, op: 'eq' })
        return builder
      },
      neq(column: string, value: unknown) {
        filters.push({ column, value, op: 'neq' })
        return builder
      },
      order() { return builder },
      range() { return builder },
      insert(value: Record<string, unknown>) {
        operation = 'insert'
        payload = value
        return builder
      },
      delete() {
        operation = 'delete'
        return builder
      },
      update(value: Record<string, unknown>) {
        operation = 'update'
        payload = value
        return builder
      },
      maybeSingle() {
        return Promise.resolve(run())
      },
      then(onFulfilled: (value: { data: unknown; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
        return Promise.resolve(run()).then(onFulfilled, onRejected)
      },
    }
    return builder
  }
  return { from } as unknown as SupabaseClient
}

describe('actions de rapprochement EcoLogits', () => {
  test('match remplace le lien 1:1, écrit un alias manual et passe le statut à matched', async () => {
    const store = createStore()
    const result = await matchEcologitsModel(createClient(store), { ecologitsModelId: ECO_ID, maydaiModelId: MAYDAI_ID })
    expect(result).toEqual({ ecologitsModelId: ECO_ID, maydaiModelId: MAYDAI_ID, status: 'matched' })
    expect(store.links).toEqual([
      { ecologits_model_id: ECO_ID, maydai_model_id: MAYDAI_ID, match_method: 'manual' },
    ])
    expect(store.aliases.filter((alias) => alias.source === 'ecologits')).toEqual([
      {
        model_id: MAYDAI_ID,
        source: 'ecologits',
        source_id: ECO_ID,
        raw_name: 'gemini-3.1-flash-image-preview',
        normalized_name: 'gemini31flashimagepreview',
        match_method: 'manual',
      },
    ])
    expect(store.aliases.some((alias) => alias.source === 'llm_stats')).toBe(true)
    expect(store.eco.link_status).toBe('matched')
  })

  test('ignore supprime le lien, l’alias EcoLogits, et passe le statut à ignored', async () => {
    const store = createStore()
    await ignoreEcologitsModel(createClient(store), ECO_ID)
    expect(store.links).toEqual([])
    expect(store.aliases.filter((alias) => alias.source === 'ecologits')).toEqual([])
    expect(store.aliases.some((alias) => alias.source === 'llm_stats')).toBe(true)
    expect(store.eco.link_status).toBe('ignored')
  })

  test('unignore et unlink retirent lien et alias puis remettent unmatched', async () => {
    const store = createStore()
    await unignoreEcologitsModel(createClient(store), ECO_ID)
    expect(store.links).toEqual([])
    expect(store.eco.link_status).toBe('unmatched')

    store.links.push({ ecologits_model_id: ECO_ID, maydai_model_id: MAYDAI_ID, match_method: 'manual' })
    store.eco.link_status = 'matched'
    await unlinkEcologitsModel(createClient(store), ECO_ID)
    expect(store.links).toEqual([])
    expect(store.eco.link_status).toBe('unmatched')
  })

  test('rejette un corps PUT vide', () => {
    const parsed = EcologitsPutLinkBodySchema.safeParse({})
    expect(parsed.success).toBe(false)
  })

  test('résume les trois qualités d’estimation et convertit kWh et kgCO2eq', () => {
    const complete = buildEcologitsEstimateSummary({
      output_token_count: 1000,
      electricity_mix_zone: 'FRA',
      energy_min: 0.0014,
      energy_max: 0.002,
      energy_unit: 'kWh',
      gwp_min: 0.00018,
      gwp_max: 0.00026,
      gwp_unit: 'kgCO2eq',
      adpe_min: 1,
      adpe_max: 2,
      pe_min: 3,
      pe_max: 4,
      wcf_min: 5,
      wcf_max: 6,
    })
    expect(complete.status).toBe('complete')
    expect(complete.filled_impacts_count).toBe(5)
    expect(complete.energy_wh_min).toBeCloseTo(1.4)
    expect(complete.energy_wh_max).toBeCloseTo(2)
    expect(complete.energy_raw_unit).toBe('kWh')
    expect(complete.gwp_gco2_min).toBeCloseTo(0.18)
    expect(complete.gwp_gco2_max).toBeCloseTo(0.26)
    expect(complete.gwp_raw_unit).toBe('kgCO2eq')

    const empty = buildEcologitsEstimateSummary({
      output_token_count: 1000,
      electricity_mix_zone: 'FRA',
      energy_unit: 'kWh',
      gwp_unit: 'kgCO2eq',
      energy_min: null,
      energy_max: null,
      gwp_min: null,
      gwp_max: null,
      adpe_min: null,
      adpe_max: null,
      pe_min: null,
      pe_max: null,
      wcf_min: null,
      wcf_max: null,
    })
    expect(empty.status).toBe('empty_metrics')
    expect(empty.filled_impacts_count).toBe(0)
    expect(empty.energy_wh_min).toBeNull()
    expect(empty.energy_raw_unit).toBe('kWh')

    const missing = buildEcologitsEstimateSummary(null)
    expect(missing.status).toBe('no_estimate')
    expect(missing.filled_impacts_count).toBe(0)
    expect(missing.output_token_count).toBeNull()
  })

  test('formate une architecture dense, un intervalle et un mélange d’experts', () => {
    expect(formatEcologitsArchitecture({ type: 'dense', parameters: 128 })).toBe('dense · 128B')
    expect(formatEcologitsArchitecture({ type: 'dense', parameters: { min: 70, max: 120 } })).toBe('dense · 70–120B')
    expect(formatEcologitsArchitecture({
      type: 'moe',
      parameters: { total: 440, active: { min: 44, max: 132 } },
    })).toBe('moe · 440B total (44–132B actifs)')
    expect(formatEcologitsArchitecture(null)).toBe('Non renseignée')
  })

  test('une fiche déjà liée à deux entrées exige un mode, ajoute sans effacer, ou remplace tout', async () => {
    const store = createStore()
    const otherA: EcoRecord = {
      id: OTHER_A,
      provider: 'openai',
      name: 'gpt-5',
      normalized_name: 'gpt5',
      link_status: 'matched',
    }
    const otherB: EcoRecord = {
      id: OTHER_B,
      provider: 'openai',
      name: 'gpt-5-2025-08-07',
      normalized_name: 'gpt520250807',
      link_status: 'matched',
    }
    const incoming: EcoRecord = {
      id: NEW_ECO,
      provider: 'openai',
      name: 'gpt-5-extra',
      normalized_name: 'gpt5extra',
      link_status: 'unmatched',
    }
    store.ecos.push(otherA, otherB, incoming)
    store.links = [
      { ecologits_model_id: OTHER_A, maydai_model_id: MAYDAI_ID, match_method: 'exact' },
      { ecologits_model_id: OTHER_B, maydai_model_id: MAYDAI_ID, match_method: 'manual' },
    ]
    store.aliases = [
      {
        model_id: MAYDAI_ID,
        source: 'ecologits',
        source_id: OTHER_A,
        raw_name: otherA.name,
        normalized_name: otherA.normalized_name,
        match_method: 'exact',
      },
      {
        model_id: MAYDAI_ID,
        source: 'ecologits',
        source_id: OTHER_B,
        raw_name: otherB.name,
        normalized_name: otherB.normalized_name,
        match_method: 'manual',
      },
      {
        model_id: MAYDAI_ID,
        source: 'llm_stats',
        source_id: 'gpt-5',
        raw_name: 'gpt-5',
        normalized_name: 'gpt-5',
        match_method: 'manual',
      },
    ]

    const blocked = matchEcologitsModel(createClient(store), {
      ecologitsModelId: NEW_ECO,
      maydaiModelId: MAYDAI_ID,
      conflictMode: 'require_explicit',
    })
    try {
      await blocked
      throw new Error('Le rapprochement aurait dû être refusé.')
    } catch (error) {
      if (!(error instanceof EcologitsLinkUpdateError)) throw error
      expect(error.status).toBe(409)
      expect(error.message).toContain('2 lien(s)')
    }
    expect(store.links).toHaveLength(2)

    await matchEcologitsModel(createClient(store), {
      ecologitsModelId: NEW_ECO,
      maydaiModelId: MAYDAI_ID,
      conflictMode: 'add',
    })
    expect(store.links.map((link) => link.ecologits_model_id).sort()).toEqual([NEW_ECO, OTHER_A, OTHER_B].sort())
    expect(store.aliases.filter((alias) => alias.source === 'ecologits').map((alias) => alias.source_id).sort()).toEqual([NEW_ECO, OTHER_A, OTHER_B].sort())
    expect(otherA.link_status).toBe('matched')
    expect(otherB.link_status).toBe('matched')
    expect(incoming.link_status).toBe('matched')

    store.links = store.links.filter((link) => link.ecologits_model_id !== NEW_ECO)
    store.aliases = store.aliases.filter((alias) => alias.source_id !== NEW_ECO)
    incoming.link_status = 'unmatched'
    await matchEcologitsModel(createClient(store), {
      ecologitsModelId: NEW_ECO,
      maydaiModelId: MAYDAI_ID,
      conflictMode: 'replace_all',
    })
    expect(store.links).toEqual([
      { ecologits_model_id: NEW_ECO, maydai_model_id: MAYDAI_ID, match_method: 'manual' },
    ])
    expect(store.aliases.filter((alias) => alias.source === 'ecologits').map((alias) => alias.source_id)).toEqual([NEW_ECO])
    expect(store.aliases.some((alias) => alias.source === 'llm_stats')).toBe(true)
    expect(otherA.link_status).toBe('unmatched')
    expect(otherB.link_status).toBe('unmatched')
    expect(incoming.link_status).toBe('matched')
  })
})
