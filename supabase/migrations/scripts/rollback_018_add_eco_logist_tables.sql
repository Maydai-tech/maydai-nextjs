-- Script de rollback : Annuler la migration 018_add_eco_logist_tables.sql
-- À utiliser uniquement en cas de problème après la migration
-- ATTENTION : Cette opération supprimera les tables eco_* et les colonnes eco_* sur compl_ai_models

begin;

-- Migration 4 : eco_evaluations_aggregated (drop table also drops its indexes)
drop table if exists public.eco_evaluations_aggregated;

-- Migration 3 : eco_evaluations (drop table also drops its indexes)
drop table if exists public.eco_evaluations;

-- Migration 2 : eco_methodology_versions
drop table if exists public.eco_methodology_versions;

-- Migration 1 : Modification compl_ai_models
drop index if exists public.idx_compl_ai_models_eco_covered;

alter table public.compl_ai_models
  drop constraint if exists compl_ai_models_provider_name_key;

-- Note: l'ancienne contrainte compl_ai_models_model_name_key est volontairement ré-ajoutée
-- pour revenir au comportement précédent (unicité sur model_name).
alter table public.compl_ai_models
  add constraint compl_ai_models_model_name_key
  unique (model_name);

alter table public.compl_ai_models
  drop column if exists eco_provider,
  drop column if exists eco_model,
  drop column if exists eco_status,
  drop column if exists eco_resolved_at;

commit;

