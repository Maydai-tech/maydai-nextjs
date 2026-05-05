export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Types Supabase (manuellement maintenus)
 * Objectif: restaurer l'autocomplétion frontend + Edge Functions pour le schéma `public`.
 */
export type Database = {
  public: {
    Tables: {
      compl_ai_models: {
        Row: {
          id: string
          model_name: string
          model_provider: string | null
          model_type: string | null
          version: string | null
          short_name: string | null
          long_name: string | null
          launch_date: string | null
          model_provider_id: number | null
          notes_short: string | null
          notes_long: string | null
          variants: string[] | null
          llm_leader_rank: number | null
          compl_ai_rank: number | null
          comparia_rank: number | null
          input_cost_per_million: number | null
          output_cost_per_million: number | null
          model_size: string | null
          gpqa_score: number | null
          aime_2025_score: number | null
          license: string | null
          context_length: number | null
          consumption_wh_per_1k_tokens: number | null
          release_date: string | null
          knowledge_cutoff: string | null
          country: string | null
          eco_provider: string | null
          eco_model: string | null
          eco_status: string | null
          eco_resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          model_name: string
          model_provider?: string | null
          model_type?: string | null
          version?: string | null
          short_name?: string | null
          long_name?: string | null
          launch_date?: string | null
          model_provider_id?: number | null
          notes_short?: string | null
          notes_long?: string | null
          variants?: string[] | null
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
          country?: string | null
          eco_provider?: string | null
          eco_model?: string | null
          eco_status?: string | null
          eco_resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          model_name?: string
          model_provider?: string | null
          model_type?: string | null
          version?: string | null
          short_name?: string | null
          long_name?: string | null
          launch_date?: string | null
          model_provider_id?: number | null
          notes_short?: string | null
          notes_long?: string | null
          variants?: string[] | null
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
          country?: string | null
          eco_provider?: string | null
          eco_model?: string | null
          eco_status?: string | null
          eco_resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      eco_methodology_versions: {
        Row: {
          id: string
          ecologits_version: string
          methodology_date: string | null
          source_url: string | null
          electricity_factor_source: string | null
          pue_default: Json | null
          units: Json
          notes: string | null
          captured_at: string
        }
        Insert: {
          id?: string
          ecologits_version: string
          methodology_date?: string | null
          source_url?: string | null
          electricity_factor_source?: string | null
          pue_default?: Json | null
          units?: Json
          notes?: string | null
          captured_at?: string
        }
        Update: {
          id?: string
          ecologits_version?: string
          methodology_date?: string | null
          source_url?: string | null
          electricity_factor_source?: string | null
          pue_default?: Json | null
          units?: Json
          notes?: string | null
          captured_at?: string
        }
      }

      eco_evaluations: {
        Row: {
          id: string
          model_id: string
          region_code: string
          run_index: number
          methodology_version_id: string
          input_tokens: number
          output_tokens: number
          request_payload: Json
          response_payload: Json
          latency_s: number | null
          warnings: string[]
          mode: 'simulated' | 'real'
          energy_usage_min: number | null
          energy_usage_value: number | null
          energy_usage_max: number | null
          energy_embodied_min: number | null
          energy_embodied_value: number | null
          energy_embodied_max: number | null
          energy_total_min: number | null
          energy_total_value: number | null
          energy_total_max: number | null
          gwp_usage_min: number | null
          gwp_usage_value: number | null
          gwp_usage_max: number | null
          gwp_embodied_min: number | null
          gwp_embodied_value: number | null
          gwp_embodied_max: number | null
          gwp_total_min: number | null
          gwp_total_value: number | null
          gwp_total_max: number | null
          adpe_usage_min: number | null
          adpe_usage_value: number | null
          adpe_usage_max: number | null
          adpe_embodied_min: number | null
          adpe_embodied_value: number | null
          adpe_embodied_max: number | null
          adpe_total_min: number | null
          adpe_total_value: number | null
          adpe_total_max: number | null
          pe_usage_min: number | null
          pe_usage_value: number | null
          pe_usage_max: number | null
          pe_embodied_min: number | null
          pe_embodied_value: number | null
          pe_embodied_max: number | null
          pe_total_min: number | null
          pe_total_value: number | null
          pe_total_max: number | null
          wcf_usage_min: number | null
          wcf_usage_value: number | null
          wcf_usage_max: number | null
          wcf_embodied_min: number | null
          wcf_embodied_value: number | null
          wcf_embodied_max: number | null
          wcf_total_min: number | null
          wcf_total_value: number | null
          wcf_total_max: number | null
          created_at: string
          ingested_at: string
        }
        Insert: {
          id?: string
          model_id: string
          region_code: string
          run_index: number
          methodology_version_id: string
          input_tokens: number
          output_tokens: number
          request_payload?: Json
          response_payload?: Json
          latency_s?: number | null
          warnings?: string[]
          mode: 'simulated' | 'real'
          energy_usage_min?: number | null
          energy_usage_value?: number | null
          energy_usage_max?: number | null
          energy_embodied_min?: number | null
          energy_embodied_value?: number | null
          energy_embodied_max?: number | null
          energy_total_min?: number | null
          energy_total_value?: number | null
          energy_total_max?: number | null
          gwp_usage_min?: number | null
          gwp_usage_value?: number | null
          gwp_usage_max?: number | null
          gwp_embodied_min?: number | null
          gwp_embodied_value?: number | null
          gwp_embodied_max?: number | null
          gwp_total_min?: number | null
          gwp_total_value?: number | null
          gwp_total_max?: number | null
          adpe_usage_min?: number | null
          adpe_usage_value?: number | null
          adpe_usage_max?: number | null
          adpe_embodied_min?: number | null
          adpe_embodied_value?: number | null
          adpe_embodied_max?: number | null
          adpe_total_min?: number | null
          adpe_total_value?: number | null
          adpe_total_max?: number | null
          pe_usage_min?: number | null
          pe_usage_value?: number | null
          pe_usage_max?: number | null
          pe_embodied_min?: number | null
          pe_embodied_value?: number | null
          pe_embodied_max?: number | null
          pe_total_min?: number | null
          pe_total_value?: number | null
          pe_total_max?: number | null
          wcf_usage_min?: number | null
          wcf_usage_value?: number | null
          wcf_usage_max?: number | null
          wcf_embodied_min?: number | null
          wcf_embodied_value?: number | null
          wcf_embodied_max?: number | null
          wcf_total_min?: number | null
          wcf_total_value?: number | null
          wcf_total_max?: number | null
          created_at?: string
          ingested_at?: string
        }
        Update: {
          id?: string
          model_id?: string
          region_code?: string
          run_index?: number
          methodology_version_id?: string
          input_tokens?: number
          output_tokens?: number
          request_payload?: Json
          response_payload?: Json
          latency_s?: number | null
          warnings?: string[]
          mode?: 'simulated' | 'real'
          energy_usage_min?: number | null
          energy_usage_value?: number | null
          energy_usage_max?: number | null
          energy_embodied_min?: number | null
          energy_embodied_value?: number | null
          energy_embodied_max?: number | null
          energy_total_min?: number | null
          energy_total_value?: number | null
          energy_total_max?: number | null
          gwp_usage_min?: number | null
          gwp_usage_value?: number | null
          gwp_usage_max?: number | null
          gwp_embodied_min?: number | null
          gwp_embodied_value?: number | null
          gwp_embodied_max?: number | null
          gwp_total_min?: number | null
          gwp_total_value?: number | null
          gwp_total_max?: number | null
          adpe_usage_min?: number | null
          adpe_usage_value?: number | null
          adpe_usage_max?: number | null
          adpe_embodied_min?: number | null
          adpe_embodied_value?: number | null
          adpe_embodied_max?: number | null
          adpe_total_min?: number | null
          adpe_total_value?: number | null
          adpe_total_max?: number | null
          pe_usage_min?: number | null
          pe_usage_value?: number | null
          pe_usage_max?: number | null
          pe_embodied_min?: number | null
          pe_embodied_value?: number | null
          pe_embodied_max?: number | null
          pe_total_min?: number | null
          pe_total_value?: number | null
          pe_total_max?: number | null
          wcf_usage_min?: number | null
          wcf_usage_value?: number | null
          wcf_usage_max?: number | null
          wcf_embodied_min?: number | null
          wcf_embodied_value?: number | null
          wcf_embodied_max?: number | null
          wcf_total_min?: number | null
          wcf_total_value?: number | null
          wcf_total_max?: number | null
          created_at?: string
          ingested_at?: string
        }
      }

      eco_evaluations_aggregated: {
        Row: {
          id: string
          model_id: string
          region_code: string
          methodology_version_id: string
          mode: 'simulated' | 'real'
          runs_count: number
          runs_with_warnings: number
          energy_usage_mean: number | null
          energy_usage_median: number | null
          energy_usage_std: number | null
          energy_usage_min_observed: number | null
          energy_usage_max_observed: number | null
          energy_embodied_mean: number | null
          energy_embodied_median: number | null
          energy_embodied_std: number | null
          energy_embodied_min_observed: number | null
          energy_embodied_max_observed: number | null
          energy_total_mean: number | null
          energy_total_median: number | null
          energy_total_std: number | null
          energy_total_min_observed: number | null
          energy_total_max_observed: number | null
          gwp_usage_mean: number | null
          gwp_usage_median: number | null
          gwp_usage_std: number | null
          gwp_usage_min_observed: number | null
          gwp_usage_max_observed: number | null
          gwp_embodied_mean: number | null
          gwp_embodied_median: number | null
          gwp_embodied_std: number | null
          gwp_embodied_min_observed: number | null
          gwp_embodied_max_observed: number | null
          gwp_total_mean: number | null
          gwp_total_median: number | null
          gwp_total_std: number | null
          gwp_total_min_observed: number | null
          gwp_total_max_observed: number | null
          adpe_usage_mean: number | null
          adpe_usage_median: number | null
          adpe_usage_std: number | null
          adpe_usage_min_observed: number | null
          adpe_usage_max_observed: number | null
          adpe_embodied_mean: number | null
          adpe_embodied_median: number | null
          adpe_embodied_std: number | null
          adpe_embodied_min_observed: number | null
          adpe_embodied_max_observed: number | null
          adpe_total_mean: number | null
          adpe_total_median: number | null
          adpe_total_std: number | null
          adpe_total_min_observed: number | null
          adpe_total_max_observed: number | null
          pe_usage_mean: number | null
          pe_usage_median: number | null
          pe_usage_std: number | null
          pe_usage_min_observed: number | null
          pe_usage_max_observed: number | null
          pe_embodied_mean: number | null
          pe_embodied_median: number | null
          pe_embodied_std: number | null
          pe_embodied_min_observed: number | null
          pe_embodied_max_observed: number | null
          pe_total_mean: number | null
          pe_total_median: number | null
          pe_total_std: number | null
          pe_total_min_observed: number | null
          pe_total_max_observed: number | null
          wcf_usage_mean: number | null
          wcf_usage_median: number | null
          wcf_usage_std: number | null
          wcf_usage_min_observed: number | null
          wcf_usage_max_observed: number | null
          wcf_embodied_mean: number | null
          wcf_embodied_median: number | null
          wcf_embodied_std: number | null
          wcf_embodied_min_observed: number | null
          wcf_embodied_max_observed: number | null
          wcf_total_mean: number | null
          wcf_total_median: number | null
          wcf_total_std: number | null
          wcf_total_min_observed: number | null
          wcf_total_max_observed: number | null
          created_at: string
          refreshed_at: string
        }
        Insert: {
          id?: string
          model_id: string
          region_code: string
          methodology_version_id: string
          mode: 'simulated' | 'real'
          runs_count: number
          runs_with_warnings?: number
          energy_usage_mean?: number | null
          energy_usage_median?: number | null
          energy_usage_std?: number | null
          energy_usage_min_observed?: number | null
          energy_usage_max_observed?: number | null
          energy_embodied_mean?: number | null
          energy_embodied_median?: number | null
          energy_embodied_std?: number | null
          energy_embodied_min_observed?: number | null
          energy_embodied_max_observed?: number | null
          energy_total_mean?: number | null
          energy_total_median?: number | null
          energy_total_std?: number | null
          energy_total_min_observed?: number | null
          energy_total_max_observed?: number | null
          gwp_usage_mean?: number | null
          gwp_usage_median?: number | null
          gwp_usage_std?: number | null
          gwp_usage_min_observed?: number | null
          gwp_usage_max_observed?: number | null
          gwp_embodied_mean?: number | null
          gwp_embodied_median?: number | null
          gwp_embodied_std?: number | null
          gwp_embodied_min_observed?: number | null
          gwp_embodied_max_observed?: number | null
          gwp_total_mean?: number | null
          gwp_total_median?: number | null
          gwp_total_std?: number | null
          gwp_total_min_observed?: number | null
          gwp_total_max_observed?: number | null
          adpe_usage_mean?: number | null
          adpe_usage_median?: number | null
          adpe_usage_std?: number | null
          adpe_usage_min_observed?: number | null
          adpe_usage_max_observed?: number | null
          adpe_embodied_mean?: number | null
          adpe_embodied_median?: number | null
          adpe_embodied_std?: number | null
          adpe_embodied_min_observed?: number | null
          adpe_embodied_max_observed?: number | null
          adpe_total_mean?: number | null
          adpe_total_median?: number | null
          adpe_total_std?: number | null
          adpe_total_min_observed?: number | null
          adpe_total_max_observed?: number | null
          pe_usage_mean?: number | null
          pe_usage_median?: number | null
          pe_usage_std?: number | null
          pe_usage_min_observed?: number | null
          pe_usage_max_observed?: number | null
          pe_embodied_mean?: number | null
          pe_embodied_median?: number | null
          pe_embodied_std?: number | null
          pe_embodied_min_observed?: number | null
          pe_embodied_max_observed?: number | null
          pe_total_mean?: number | null
          pe_total_median?: number | null
          pe_total_std?: number | null
          pe_total_min_observed?: number | null
          pe_total_max_observed?: number | null
          wcf_usage_mean?: number | null
          wcf_usage_median?: number | null
          wcf_usage_std?: number | null
          wcf_usage_min_observed?: number | null
          wcf_usage_max_observed?: number | null
          wcf_embodied_mean?: number | null
          wcf_embodied_median?: number | null
          wcf_embodied_std?: number | null
          wcf_embodied_min_observed?: number | null
          wcf_embodied_max_observed?: number | null
          wcf_total_mean?: number | null
          wcf_total_median?: number | null
          wcf_total_std?: number | null
          wcf_total_min_observed?: number | null
          wcf_total_max_observed?: number | null
          created_at?: string
          refreshed_at?: string
        }
        Update: {
          id?: string
          model_id?: string
          region_code?: string
          methodology_version_id?: string
          mode?: 'simulated' | 'real'
          runs_count?: number
          runs_with_warnings?: number
          energy_usage_mean?: number | null
          energy_usage_median?: number | null
          energy_usage_std?: number | null
          energy_usage_min_observed?: number | null
          energy_usage_max_observed?: number | null
          energy_embodied_mean?: number | null
          energy_embodied_median?: number | null
          energy_embodied_std?: number | null
          energy_embodied_min_observed?: number | null
          energy_embodied_max_observed?: number | null
          energy_total_mean?: number | null
          energy_total_median?: number | null
          energy_total_std?: number | null
          energy_total_min_observed?: number | null
          energy_total_max_observed?: number | null
          gwp_usage_mean?: number | null
          gwp_usage_median?: number | null
          gwp_usage_std?: number | null
          gwp_usage_min_observed?: number | null
          gwp_usage_max_observed?: number | null
          gwp_embodied_mean?: number | null
          gwp_embodied_median?: number | null
          gwp_embodied_std?: number | null
          gwp_embodied_min_observed?: number | null
          gwp_embodied_max_observed?: number | null
          gwp_total_mean?: number | null
          gwp_total_median?: number | null
          gwp_total_std?: number | null
          gwp_total_min_observed?: number | null
          gwp_total_max_observed?: number | null
          adpe_usage_mean?: number | null
          adpe_usage_median?: number | null
          adpe_usage_std?: number | null
          adpe_usage_min_observed?: number | null
          adpe_usage_max_observed?: number | null
          adpe_embodied_mean?: number | null
          adpe_embodied_median?: number | null
          adpe_embodied_std?: number | null
          adpe_embodied_min_observed?: number | null
          adpe_embodied_max_observed?: number | null
          adpe_total_mean?: number | null
          adpe_total_median?: number | null
          adpe_total_std?: number | null
          adpe_total_min_observed?: number | null
          adpe_total_max_observed?: number | null
          pe_usage_mean?: number | null
          pe_usage_median?: number | null
          pe_usage_std?: number | null
          pe_usage_min_observed?: number | null
          pe_usage_max_observed?: number | null
          pe_embodied_mean?: number | null
          pe_embodied_median?: number | null
          pe_embodied_std?: number | null
          pe_embodied_min_observed?: number | null
          pe_embodied_max_observed?: number | null
          pe_total_mean?: number | null
          pe_total_median?: number | null
          pe_total_std?: number | null
          pe_total_min_observed?: number | null
          pe_total_max_observed?: number | null
          wcf_usage_mean?: number | null
          wcf_usage_median?: number | null
          wcf_usage_std?: number | null
          wcf_usage_min_observed?: number | null
          wcf_usage_max_observed?: number | null
          wcf_embodied_mean?: number | null
          wcf_embodied_median?: number | null
          wcf_embodied_std?: number | null
          wcf_embodied_min_observed?: number | null
          wcf_embodied_max_observed?: number | null
          wcf_total_mean?: number | null
          wcf_total_median?: number | null
          wcf_total_std?: number | null
          wcf_total_min_observed?: number | null
          wcf_total_max_observed?: number | null
          created_at?: string
          refreshed_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

