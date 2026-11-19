alter table public.compl_ai_models
  add column if not exists llm_stats_id text;

create unique index if not exists compl_ai_models_llm_stats_id_unique
  on public.compl_ai_models (llm_stats_id)
  where llm_stats_id is not null;

comment on column public.compl_ai_models.llm_stats_id is
  'Identifiant canonique du modèle côté LLM Stats utilisé par la synchronisation Bench LLM.';

notify pgrst, 'reload schema';
