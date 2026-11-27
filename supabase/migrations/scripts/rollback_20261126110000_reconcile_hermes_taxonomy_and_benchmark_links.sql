-- Annule 20261126110000_reconcile_hermes_taxonomy_and_benchmark_links.sql
-- Restaure l'état audité le 26/11/2026. Ne modifie pas usecases,
-- usecase_history, ni score_base, score_model, score_final.

begin;

-- B. Fiches, valeurs constatées avant la réconciliation.

update public.compl_ai_models
set lifecycle_status = 'deprecated',
    role = 'stade',
    launch_date = date '2026-11-11',
    deprecation_date = date '2026-11-11',
    retirement_date = date '2026-11-25',
    reference_model_id = 'e948dec0-e65f-44ca-ba71-2960fc3640b5',
    replacement_model_id = 'e948dec0-e65f-44ca-ba71-2960fc3640b5',
    updated_at = now()
where id = 'f14dac64-4992-4c1a-8602-e9880e4b2392';

update public.compl_ai_models
set lifecycle_status = 'active',
    role = 'non_documente',
    launch_date = date '2026-11-16',
    license_class = 'proprietary',
    updated_at = now()
where id = 'e948dec0-e65f-44ca-ba71-2960fc3640b5';

update public.compl_ai_models
set lifecycle_status = null,
    role = 'a_classer',
    launch_date = null,
    base_model_id = null,
    reference_model_id = null,
    license = 'Open',
    license_class = 'unknown',
    license_id = null,
    license_eu_restricted = false,
    updated_at = now()
where id = '113a495d-ffe5-46e2-84bf-910f4f605b38';

update public.compl_ai_models
set lifecycle_status = null,
    role = 'a_classer',
    launch_date = null,
    base_model_id = null,
    license = 'Proprietary',
    license_class = 'unknown',
    license_eu_restricted = false,
    updated_at = now()
where id = '58948fe0-2ee3-4362-a9dc-3faba68387a0';

update public.compl_ai_models
set lifecycle_status = 'retired',
    role = 'non_documente',
    retirement_date = null,
    lifecycle_source_url = null,
    replacement_model_id = null,
    updated_at = now()
where id = '1848a3f6-202a-4800-abef-42a1cecc8388';

update public.compl_ai_models
set lifecycle_status = 'retired',
    role = 'reglage',
    retirement_date = null,
    lifecycle_source_url = null,
    reference_model_id = '1848a3f6-202a-4800-abef-42a1cecc8388',
    replacement_model_id = null,
    updated_at = now()
where id = '79924e2c-5941-48c0-bf40-6410676947fb';

update public.compl_ai_models
set lifecycle_status = 'deprecated',
    role = 'base',
    deprecation_date = date '2026-06-09',
    retirement_date = null,
    replacement_model_id = null
where id = '8b2e2104-2263-4aea-95bb-b61869fe500f';

update public.compl_ai_models
set lifecycle_status = 'retired',
    role = 'base',
    deprecation_date = date '2026-05-08',
    retirement_date = date '2026-08-10',
    replacement_model_id = '47f7cb3d-898f-4809-bbab-8057da7fb1b6'
where id = 'c87bd5d6-48fe-4078-bd79-252892bbace8';

update public.compl_ai_models
set lifecycle_status = 'retired',
    role = 'non_documente',
    deprecation_date = null,
    retirement_date = null,
    reference_model_id = null,
    merged_into_id = null,
    replacement_model_id = null,
    license = null,
    license_class = 'open_free',
    license_id = 'apache-2.0',
    updated_at = now()
where id = '51c0399c-0afb-44e4-b86d-226825fef60e';

update public.compl_ai_models
set replacement_model_id = '6eeb1f37-15f6-45d4-93c5-9ecee05a81ba',
    updated_at = now()
where id = '2d7ee342-f8dd-461b-b701-3256ffd62e2f';

update public.compl_ai_models
set replacement_model_id = '58702394-db65-4954-8dcd-aa37ce2e60e3',
    updated_at = now()
where id = 'f04a9215-6f5a-46f6-9cbd-42a9401d37a2';

update public.compl_ai_models
set replacement_model_id = '72cf24a4-9228-4a1e-adca-87c1bff575e4',
    updated_at = now()
where id = 'b0d3c769-5294-4fd0-be8b-fcb50d4ad9c1';

update public.compl_ai_models m
set comparia_rank = restored.comparia_rank,
    consumption_wh_per_1k_tokens = restored.consumption_wh_per_1k_tokens,
    updated_at = now()
from (
  values
    ('df3f3f2d-f8ab-4289-b39b-ff535010a913'::uuid, 92, 0.658),
    ('6b21665a-10ab-4603-b73a-6c5e744e555f'::uuid, 98, 0.082),
    ('d666ef1a-bda1-4aab-bd19-eaf4384f61be'::uuid, 81, 0.081),
    ('78f893dd-7e44-4059-ae60-ddd67ac9ca06'::uuid, 126, 0.089)
) as restored(id, comparia_rank, consumption_wh_per_1k_tokens)
where m.id = restored.id;

-- C. Alias EcoLogits et lien Gemini 1.5 Flash.
-- mistral-medium-3 reste lié à Mistral Medium 3 ; son statut redevient unmatched.

insert into public.llm_model_aliases (
  id, model_id, source, source_id, raw_name, normalized_name, match_method
)
values
  (
    '6f05b2e8-e66c-45ae-929e-e33ad69fb93c',
    'c4ebe815-b69b-4da2-b366-20dce7349782',
    'ecologits',
    '13528f85-7893-494a-8c67-511bda8fc813',
    'gemini-3.1-flash-image-preview',
    'gemini31flashimagepreview',
    'manual'
  ),
  (
    '07108ab9-54d4-4b9b-9c66-b03abdd485e5',
    'c4ebe815-b69b-4da2-b366-20dce7349782',
    'ecologits',
    'c8da2a5b-c388-4e5d-aabc-56495305433d',
    'gemini-flash-lite-latest',
    'geminiflashlitelatest',
    'manual'
  ),
  (
    '4f659e42-01bf-42d9-bc49-bcab4c411d0c',
    'c4ebe815-b69b-4da2-b366-20dce7349782',
    'ecologits',
    '675a8ce7-5b20-4b9b-93c8-1a35d4e18bef',
    'gemini-flash-latest',
    'geminiflashlatest',
    'manual'
  ),
  (
    '5313f079-224a-4b48-a93c-3f300172cc1e',
    '354120aa-a79e-4b6c-a501-c2e20226f327',
    'ecologits',
    '1c5a0c39-0a4a-41c1-9f54-8ac0c8f61cdf',
    'mistral-medium-3',
    'mistralmedium3',
    'manual'
  )
on conflict do nothing;

insert into public.ecologits_model_links (
  id, ecologits_model_id, maydai_model_id, match_method
)
select
  '957472c8-807b-4db0-b7db-611b72aacb8e',
  '13528f85-7893-494a-8c67-511bda8fc813',
  'c4ebe815-b69b-4da2-b366-20dce7349782',
  'exact'
where not exists (
  select 1
  from public.ecologits_model_links
  where id = '957472c8-807b-4db0-b7db-611b72aacb8e'
     or ecologits_model_id = '13528f85-7893-494a-8c67-511bda8fc813'
     or maydai_model_id = 'c4ebe815-b69b-4da2-b366-20dce7349782'
);

update public.ecologits_models
set link_status = 'unmatched',
    updated_at = now()
where id in (
  '13528f85-7893-494a-8c67-511bda8fc813',
  '675a8ce7-5b20-4b9b-93c8-1a35d4e18bef',
  'c8da2a5b-c388-4e5d-aabc-56495305433d',
  '1c5a0c39-0a4a-41c1-9f54-8ac0c8f61cdf'
);

-- D. Rattachements Compar:IA et pivots.

update public.comparia_models cm
set maydai_model_id = restored.maydai_model_id,
    match_method = 'manual',
    link_status = 'matched',
    updated_at = now()
from (
  values
    ('947ff3b7-f561-4ad4-ab8f-dce78cf201b1'::uuid, 'df3f3f2d-f8ab-4289-b39b-ff535010a913'::uuid),
    ('8450d2e2-50a4-4df3-b715-0879d7683b4f'::uuid, '6b21665a-10ab-4603-b73a-6c5e744e555f'::uuid),
    ('fc864297-5597-4e75-aea1-538761949831'::uuid, 'd666ef1a-bda1-4aab-bd19-eaf4384f61be'::uuid),
    ('a59cbb62-8585-43c2-8e63-e462522f4829'::uuid, '78f893dd-7e44-4059-ae60-ddd67ac9ca06'::uuid)
) as restored(id, maydai_model_id)
where cm.id = restored.id;

insert into public.llm_model_source_ids (id, model_id, source, source_id, match_method)
values
  (
    '0768d99f-7c45-4242-81ba-9e28208ef7e4',
    'df3f3f2d-f8ab-4289-b39b-ff535010a913',
    'comparia',
    'hermes-4-70b',
    'manual'
  ),
  (
    'f0e285a0-ad84-47b5-83af-60b92fa151fe',
    '6b21665a-10ab-4603-b73a-6c5e744e555f',
    'comparia',
    'lfm2-24b-a2b',
    'manual'
  ),
  (
    'fa8c694b-c60a-43a0-83c6-18ebce5044bb',
    '78f893dd-7e44-4059-ae60-ddd67ac9ca06',
    'comparia',
    'qwen-3-8b',
    'manual'
  ),
  (
    'a8f528e9-195a-4429-8dd9-2cf02606168e',
    'd666ef1a-bda1-4aab-bd19-eaf4384f61be',
    'comparia',
    'lfm2-8b-a1b',
    'manual'
  )
on conflict do nothing;

do $$
begin
  if to_regclass('supabase_migrations.schema_migrations') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'supabase_migrations'
         and table_name = 'schema_migrations'
         and column_name = 'version'
     ) then
    delete from supabase_migrations.schema_migrations
    where version = '20261126110000';
  end if;
end $$;

commit;
