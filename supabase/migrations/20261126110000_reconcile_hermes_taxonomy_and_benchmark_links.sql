-- Réconciliation Hermès du 26/11/2026 : cycle de vie, alias EcoLogits
-- et détachement Compar:IA. Ne modifie pas usecases, usecase_history,
-- ni score_base, score_model, score_final.
-- La date de lancement de la Tour de Contrôle est launch_date.
-- release_date, lifecycle_checked_at et system_card_status ne sont pas touchés.

begin;

-- A. Historique de 20261126003000, uniquement si la table existe.
do $$
declare
  column_list text := 'version';
  value_list text := quote_literal('20261126003000');
  statements_required boolean;
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'supabase_migrations'
      and table_name = 'schema_migrations'
  ) then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'supabase_migrations'
      and table_name = 'schema_migrations'
      and column_name = 'version'
  ) then
    return;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'supabase_migrations'
      and table_name = 'schema_migrations'
      and column_name = 'name'
  ) then
    column_list := column_list || ', name';
    value_list := value_list || ', ' || quote_literal('fix_llm_sync_and_ecologits_links');
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'supabase_migrations'
      and table_name = 'schema_migrations'
      and column_name = 'statements'
      and is_nullable = 'NO'
      and column_default is null
  ) into statements_required;

  if statements_required then
    column_list := column_list || ', statements';
    value_list := value_list || ', array[]::text[]';
  end if;

  execute format(
    'insert into supabase_migrations.schema_migrations (%s) values (%s) on conflict do nothing',
    column_list,
    value_list
  );
end $$;

-- B. Cycle de vie et classement.

update public.compl_ai_models
set lifecycle_status = 'retired',
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
set lifecycle_status = 'active',
    role = 'base',
    launch_date = date '2026-11-18',
    base_model_id = null,
    reference_model_id = null,
    license = 'MIT',
    license_class = 'open_free',
    license_id = 'mit',
    license_eu_restricted = false,
    updated_at = now()
where id = '113a495d-ffe5-46e2-84bf-910f4f605b38';

update public.compl_ai_models
set lifecycle_status = 'active',
    role = 'version',
    launch_date = date '2026-11-18',
    base_model_id = '55e15c11-d802-4c4c-afd4-7db907c6837d',
    license = 'Proprietary',
    license_class = 'proprietary',
    license_eu_restricted = false,
    updated_at = now()
where id = '58948fe0-2ee3-4362-a9dc-3faba68387a0';

update public.compl_ai_models
set lifecycle_status = 'retired',
    role = 'non_documente',
    retirement_date = date '2026-05-15',
    lifecycle_source_url = 'https://docs.x.ai/docs/migration/may-15-retirement',
    replacement_model_id = '56adadb8-a67a-4341-b153-84cf3b8dede3',
    updated_at = now()
where id = '1848a3f6-202a-4800-abef-42a1cecc8388';

update public.compl_ai_models
set lifecycle_status = 'retired',
    role = 'reglage',
    retirement_date = date '2026-05-15',
    lifecycle_source_url = 'https://docs.x.ai/docs/migration/may-15-retirement',
    reference_model_id = '1848a3f6-202a-4800-abef-42a1cecc8388',
    replacement_model_id = '56adadb8-a67a-4341-b153-84cf3b8dede3',
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
    deprecation_date = date '2024-11-30',
    retirement_date = date '2025-03-30',
    reference_model_id = null,
    merged_into_id = null,
    replacement_model_id = '80a712c2-dead-4647-ac8c-59604cecef9c',
    license = coalesce(license, 'Open'),
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

-- C. Alias et liens EcoLogits.
-- L'alias llm_stats 4d8d181e-b8a4-4596-9fc6-8669b9973e8c reste en place.

delete from public.llm_model_aliases
where id in (
  '6f05b2e8-e66c-45ae-929e-e33ad69fb93c',
  '07108ab9-54d4-4b9b-9c66-b03abdd485e5',
  '4f659e42-01bf-42d9-bc49-bcab4c411d0c',
  '5313f079-224a-4b48-a93c-3f300172cc1e'
)
or (
  source = 'ecologits'
  and (
    (source_id = '13528f85-7893-494a-8c67-511bda8fc813' and model_id = 'c4ebe815-b69b-4da2-b366-20dce7349782')
    or (source_id = 'c8da2a5b-c388-4e5d-aabc-56495305433d' and model_id = 'c4ebe815-b69b-4da2-b366-20dce7349782')
    or (source_id = '675a8ce7-5b20-4b9b-93c8-1a35d4e18bef' and model_id = 'c4ebe815-b69b-4da2-b366-20dce7349782')
    or (source_id = '1c5a0c39-0a4a-41c1-9f54-8ac0c8f61cdf' and model_id = '354120aa-a79e-4b6c-a501-c2e20226f327')
  )
);

delete from public.ecologits_model_links
where ecologits_model_id in (
  '13528f85-7893-494a-8c67-511bda8fc813',
  '675a8ce7-5b20-4b9b-93c8-1a35d4e18bef',
  'c8da2a5b-c388-4e5d-aabc-56495305433d'
)
or (
  ecologits_model_id = '1c5a0c39-0a4a-41c1-9f54-8ac0c8f61cdf'
  and maydai_model_id = '354120aa-a79e-4b6c-a501-c2e20226f327'
);

insert into public.ecologits_model_links (ecologits_model_id, maydai_model_id, match_method)
select
  '1c5a0c39-0a4a-41c1-9f54-8ac0c8f61cdf',
  '15a9f2c7-b229-4e55-aa41-d643f3177aeb',
  'exact'
where not exists (
  select 1
  from public.ecologits_model_links
  where ecologits_model_id = '1c5a0c39-0a4a-41c1-9f54-8ac0c8f61cdf'
     or maydai_model_id = '15a9f2c7-b229-4e55-aa41-d643f3177aeb'
);

update public.ecologits_models
set link_status = 'ignored',
    updated_at = now()
where id in (
  '13528f85-7893-494a-8c67-511bda8fc813',
  '675a8ce7-5b20-4b9b-93c8-1a35d4e18bef',
  'c8da2a5b-c388-4e5d-aabc-56495305433d'
);

update public.ecologits_models em
set link_status = case
      when exists (
        select 1
        from public.ecologits_model_links eml
        where eml.ecologits_model_id = em.id
      ) then 'matched'
      else 'unmatched'
    end,
    updated_at = now()
where em.link_status is distinct from 'ignored';

-- D. Compar:IA. ignored impose maydai_model_id et match_method nuls.

update public.comparia_models
set maydai_model_id = null,
    match_method = null,
    link_status = 'ignored',
    updated_at = now()
where id in (
  '947ff3b7-f561-4ad4-ab8f-dce78cf201b1',
  '8450d2e2-50a4-4df3-b715-0879d7683b4f',
  'fc864297-5597-4e75-aea1-538761949831',
  'a59cbb62-8585-43c2-8e63-e462522f4829'
);

delete from public.llm_model_source_ids
where id in (
  '0768d99f-7c45-4242-81ba-9e28208ef7e4',
  'f0e285a0-ad84-47b5-83af-60b92fa151fe',
  'fa8c694b-c60a-43a0-83c6-18ebce5044bb',
  'a8f528e9-195a-4429-8dd9-2cf02606168e'
)
or (
  source = 'comparia'
  and source_id in ('hermes-4-70b', 'lfm2-24b-a2b', 'lfm2-8b-a1b', 'qwen-3-8b')
);

update public.compl_ai_models m
set comparia_rank = null,
    consumption_wh_per_1k_tokens = null,
    updated_at = now()
where m.id in (
  'df3f3f2d-f8ab-4289-b39b-ff535010a913',
  '6b21665a-10ab-4603-b73a-6c5e744e555f',
  'd666ef1a-bda1-4aab-bd19-eaf4384f61be',
  '78f893dd-7e44-4059-ae60-ddd67ac9ca06'
)
and not exists (
  select 1
  from public.comparia_models cm
  where cm.maydai_model_id = m.id
);

commit;
