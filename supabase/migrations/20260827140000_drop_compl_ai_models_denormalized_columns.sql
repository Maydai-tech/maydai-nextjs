-- Phase Contract : suppression des colonnes dénormalisées de compl_ai_models.
-- Identités sources : llm_model_source_ids. Scoring : compl_ai_evaluations.

drop index if exists public.compl_ai_models_llm_stats_id_unique;
drop index if exists public.idx_compl_ai_models_eco_covered;

alter table public.compl_ai_models
  drop column if exists llm_stats_id,
  drop column if exists eco_provider,
  drop column if exists eco_model,
  drop column if exists eco_status,
  drop column if exists eco_resolved_at;

notify pgrst, 'reload schema';
