/**
 * Types pour la page Bench LLM
 */

export interface BenchLLMModel {
  id: string
  model_name: string
  model_provider?: string
  country?: string
  llm_leader_rank?: number | null
  compl_ai_rank?: number | null
  comparia_rank?: number | null
  input_cost_per_million?: number | null
  output_cost_per_million?: number | null
  model_size?: string | null
  gpqa_score?: number | null
  aime_2025_score?: number | null
  license?: string | null
  context_length?: number | null
  consumption_wh_per_1k_tokens?: number | null
  release_date?: string | null
  knowledge_cutoff?: string | null
  created_at: string
  updated_at: string
}

export interface BenchLLMFilters {
  provider?: string[]
  license?: string[]
  size?: string[]
  multimodal?: boolean
  open?: boolean
  longContext?: boolean
  small?: boolean
  searchTerm?: string
}

export interface BenchLLMSort {
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export interface BenchLLMPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface BenchLLMResponse {
  models: BenchLLMModel[]
  pagination: BenchLLMPagination
}

export type SortableColumn = 
  | 'model_name'
  | 'model_provider'
  | 'country'
  | 'llm_leader_rank'
  | 'compl_ai_rank'
  | 'comparia_rank'
  | 'input_cost_per_million'
  | 'output_cost_per_million'
  | 'model_size'
  | 'gpqa_score'
  | 'aime_2025_score'
  | 'license'
  | 'context_length'
  | 'consumption_wh_per_1k_tokens'
  | 'release_date'
  | 'knowledge_cutoff'

