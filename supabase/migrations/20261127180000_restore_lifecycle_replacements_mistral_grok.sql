-- Restaure les remplaçants et dates de retrait écrasés par une application
-- de la Tour de Contrôle sur des cellules Remplacement vides.
-- Ne modifie pas usecases, usecase_responses, usecase_history,
-- score_base, score_model, score_final.

begin;

update public.compl_ai_models
set replacement_model_id = '80a712c2-dead-4647-ac8c-59604cecef9c',
    deprecation_date = date '2024-11-30',
    retirement_date = date '2025-03-30',
    lifecycle_source_url = 'https://docs.mistral.ai/models',
    updated_at = now()
where id = '51c0399c-0afb-44e4-b86d-226825fef60e'
  and exists (
    select 1 from public.compl_ai_models present where present.id = '51c0399c-0afb-44e4-b86d-226825fef60e'
  )
  and (
    replacement_model_id is distinct from '80a712c2-dead-4647-ac8c-59604cecef9c'
    or deprecation_date is distinct from date '2024-11-30'
    or retirement_date is distinct from date '2025-03-30'
    or lifecycle_source_url is distinct from 'https://docs.mistral.ai/models'
  );

update public.compl_ai_models
set replacement_model_id = '56adadb8-a67a-4341-b153-84cf3b8dede3',
    retirement_date = date '2026-05-15',
    lifecycle_source_url = 'https://docs.x.ai/docs/migration/may-15-retirement',
    updated_at = now()
where id = '1848a3f6-202a-4800-abef-42a1cecc8388'
  and exists (
    select 1 from public.compl_ai_models present where present.id = '1848a3f6-202a-4800-abef-42a1cecc8388'
  )
  and (
    replacement_model_id is distinct from '56adadb8-a67a-4341-b153-84cf3b8dede3'
    or retirement_date is distinct from date '2026-05-15'
    or lifecycle_source_url is distinct from 'https://docs.x.ai/docs/migration/may-15-retirement'
  );

update public.compl_ai_models
set replacement_model_id = '56adadb8-a67a-4341-b153-84cf3b8dede3',
    retirement_date = date '2026-05-15',
    lifecycle_source_url = 'https://docs.x.ai/docs/migration/may-15-retirement',
    updated_at = now()
where id = '79924e2c-5941-48c0-bf40-6410676947fb'
  and exists (
    select 1 from public.compl_ai_models present where present.id = '79924e2c-5941-48c0-bf40-6410676947fb'
  )
  and (
    replacement_model_id is distinct from '56adadb8-a67a-4341-b153-84cf3b8dede3'
    or retirement_date is distinct from date '2026-05-15'
    or lifecycle_source_url is distinct from 'https://docs.x.ai/docs/migration/may-15-retirement'
  );

commit;
