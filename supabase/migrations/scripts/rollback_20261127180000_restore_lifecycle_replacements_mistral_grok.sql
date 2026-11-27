-- Annule 20261127180000_restore_lifecycle_replacements_mistral_grok.sql
-- Restaure l'état audité avant cette migration :
-- replacement, dépréciation et retrait nuls, URL de source du Sheet,
-- updated_at inchangé au 26/11/2026 10:22:41.728917+00.
-- Ne modifie pas usecases, usecase_responses, usecase_history,
-- score_base, score_model, score_final.

begin;

update public.compl_ai_models
set replacement_model_id = null,
    deprecation_date = null,
    retirement_date = null,
    lifecycle_source_url = 'https://docs.mistral.ai/models',
    updated_at = '2026-11-26 10:22:41.728917+00'::timestamptz
where id = '51c0399c-0afb-44e4-b86d-226825fef60e'
  and exists (
    select 1 from public.compl_ai_models present where present.id = '51c0399c-0afb-44e4-b86d-226825fef60e'
  );

update public.compl_ai_models
set replacement_model_id = null,
    deprecation_date = null,
    retirement_date = null,
    lifecycle_source_url = 'https://docs.x.ai/developers/models',
    updated_at = '2026-11-26 10:22:41.728917+00'::timestamptz
where id = '1848a3f6-202a-4800-abef-42a1cecc8388'
  and exists (
    select 1 from public.compl_ai_models present where present.id = '1848a3f6-202a-4800-abef-42a1cecc8388'
  );

update public.compl_ai_models
set replacement_model_id = null,
    deprecation_date = null,
    retirement_date = null,
    lifecycle_source_url = 'https://docs.x.ai/developers/models',
    updated_at = '2026-11-26 10:22:41.728917+00'::timestamptz
where id = '79924e2c-5941-48c0-bf40-6410676947fb'
  and exists (
    select 1 from public.compl_ai_models present where present.id = '79924e2c-5941-48c0-bf40-6410676947fb'
  );

commit;
