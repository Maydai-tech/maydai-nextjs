-- Annule 20261127143000_clean_benchmark_multi_links_hermes.sql
-- N'annule que les modifications EcoLogits de cette migration.
-- Ne touche pas Compar:IA : les 15 lignes étaient déjà réconciliées
-- dans l'UI (0 unmatched) avant la migration.
-- État canonique juste avant la migration, après le clic de test Remplacer :
--   b47df4f9 mistral-medium-2604 = matched vers 354120aa
--   b4b06caa mistral-medium-3-5 = unmatched, sans lien
--   a89d4ca8 mistral-medium-3.5 = unmatched, alias EcoLogits orphelin
-- Ne modifie pas usecases, usecase_responses, usecase_history,
-- score_base, score_model, score_final, ni compl_ai_models.

begin;

-- A. Retirer les rattachements créés par la migration.
-- b47df4f9 reste matched : il l'était déjà avant.

delete from public.llm_model_aliases a
where a.source = 'ecologits'
  and a.source_id in (
    '69a3842d-be4a-4d93-af37-40c55663d723',
    '0e803c5f-c6ff-4362-92a7-b26cdaa58ca2',
    '65969697-e0b7-4eb1-870e-0dade1f8a1f6',
    '82b34b7d-2f84-4619-a0bd-7bdc16525f95',
    'b4b06caa-41ab-404b-bf74-3dff34d54407',
    'a89d4ca8-ae89-48d8-b88b-572c411e6ed9'
  );

delete from public.ecologits_model_links l
where l.ecologits_model_id in (
  '69a3842d-be4a-4d93-af37-40c55663d723',
  '0e803c5f-c6ff-4362-92a7-b26cdaa58ca2',
  '65969697-e0b7-4eb1-870e-0dade1f8a1f6',
  '82b34b7d-2f84-4619-a0bd-7bdc16525f95',
  'b4b06caa-41ab-404b-bf74-3dff34d54407',
  'a89d4ca8-ae89-48d8-b88b-572c411e6ed9'
);

update public.ecologits_models em
set link_status = 'unmatched',
    updated_at = now()
where em.id in (
  '69a3842d-be4a-4d93-af37-40c55663d723',
  '0e803c5f-c6ff-4362-92a7-b26cdaa58ca2',
  '65969697-e0b7-4eb1-870e-0dade1f8a1f6',
  '82b34b7d-2f84-4619-a0bd-7bdc16525f95',
  'b4b06caa-41ab-404b-bf74-3dff34d54407',
  'a89d4ca8-ae89-48d8-b88b-572c411e6ed9'
)
and exists (select 1 from public.ecologits_models present where present.id = em.id)
and not exists (
  select 1 from public.ecologits_model_links l where l.ecologits_model_id = em.id
);

-- A2. Garantir le lien pré-migration de mistral-medium-2604.

insert into public.ecologits_model_links (ecologits_model_id, maydai_model_id, match_method)
select
  'b47df4f9-2de7-4245-a49f-1086f12ad4f4',
  '354120aa-a79e-4b6c-a501-c2e20226f327',
  'manual'
where exists (
  select 1 from public.ecologits_models e where e.id = 'b47df4f9-2de7-4245-a49f-1086f12ad4f4'
)
and exists (
  select 1 from public.compl_ai_models m where m.id = '354120aa-a79e-4b6c-a501-c2e20226f327'
)
on conflict (ecologits_model_id) do update
set maydai_model_id = excluded.maydai_model_id,
    match_method = excluded.match_method,
    updated_at = now();

insert into public.llm_model_aliases (
  model_id, source, source_id, raw_name, normalized_name, match_method
)
select
  '354120aa-a79e-4b6c-a501-c2e20226f327',
  'ecologits',
  e.id::text,
  e.name,
  coalesce(e.normalized_name, 'mistralmedium2604'),
  'manual'
from public.ecologits_models e
where e.id = 'b47df4f9-2de7-4245-a49f-1086f12ad4f4'
on conflict (source, source_id) do update
set model_id = excluded.model_id,
    raw_name = excluded.raw_name,
    normalized_name = excluded.normalized_name,
    match_method = excluded.match_method;

update public.ecologits_models em
set link_status = 'matched',
    updated_at = now()
where em.id = 'b47df4f9-2de7-4245-a49f-1086f12ad4f4'
  and exists (
    select 1
    from public.ecologits_model_links l
    where l.ecologits_model_id = em.id
      and l.maydai_model_id = '354120aa-a79e-4b6c-a501-c2e20226f327'
  );

-- B. Les 21 ignorés seulement parce qu'ils étaient unmatched redeviennent unmatched.

update public.ecologits_models em
set link_status = 'unmatched',
    updated_at = now()
where em.link_status = 'ignored'
  and em.id in (
    '8664ab50-628d-4fff-8501-fe82a4ec04c4',
    '1953a7d7-f10b-49fc-b45b-3f97554a3782',
    '112a1b67-4a8b-44ec-850b-ef85057862c0',
    '10e18cba-66d1-4e0d-95c3-63dfc4459f25',
    'dd2f007c-facf-45b7-bf2e-c392395c2c62',
    '8a986d1a-8690-41d7-8ed2-d44f865c3e14',
    '9b7fd672-e9de-4486-9f15-2e2b2a1f8d44',
    'df3a5190-27bb-4cd2-9676-8c286cc42295',
    'fd6b9882-0c40-46f3-aca9-c51a1d45adc2',
    '13cbd8cc-6e4e-485e-a527-e1da6fb25c7c',
    '69e6c870-6165-41b5-b77b-b6377b0a5d04',
    'ff8d893a-a432-4de4-8ba9-cc1d80970ba5',
    '29417208-f8e8-4509-830b-15d3c7a5be20',
    '04fbf16a-f96e-4e18-a246-316499cda12a',
    'e016fe80-8c9d-4f0d-9f9a-cfa7f904d913',
    'e526a3f0-a362-4a26-ab47-2ff1f2ee9d65',
    '97dbe8b6-4c69-4a57-87db-cbe36daee7ee',
    'c66a6fdf-4e3c-43f5-a816-679cf4ae45eb',
    '7fbdf91f-2c15-48a4-a73a-c559f3a062fe',
    '2954b595-911d-460f-a1e7-1934c67e4013',
    'e373dc90-2b3e-4bbc-bfa8-3d4a594ce4d9'
  )
  and not exists (
    select 1 from public.ecologits_model_links l where l.ecologits_model_id = em.id
  );

-- C. Rendre les quatre liens déplacés à leur fiche d'origine.

update public.ecologits_model_links l
set maydai_model_id = v.maydai_id,
    match_method = 'manual',
    updated_at = now()
from (
  values
    ('5685419e-a06d-4f80-8144-43191a804e86'::uuid, '0e1f3603-f6cf-4df1-9a15-d4f1a9914c24'::uuid),
    ('edc937f9-78fc-403c-9d5c-8ccb535a27c3'::uuid, '0e1f3603-f6cf-4df1-9a15-d4f1a9914c24'::uuid),
    ('c109eb5f-108c-4512-b181-b05f59908414'::uuid, 'd0c50633-8c19-4344-a19f-e0430c88a687'::uuid),
    ('2e39eb29-0280-424c-b560-2a8d7cb236d2'::uuid, '64a42ba2-7431-463b-b0e2-d519d5e2e61f'::uuid)
) as v(eco_id, maydai_id)
where l.ecologits_model_id = v.eco_id
  and exists (select 1 from public.compl_ai_models m where m.id = v.maydai_id);

-- D. Recréer les 27 liens coupés, avec leur id d'origine.
-- id, ecologits_model_id, maydai_model_id.

insert into public.ecologits_model_links (id, ecologits_model_id, maydai_model_id, match_method)
select v.link_id, v.eco_id, v.maydai_id, 'manual'
from (
  values
    ('a7bff88c-398a-49f5-b47e-e6f9d032f4bd'::uuid, 'f76d1343-fdab-4656-a92b-8d00f39583b8'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('9a2ad91b-f5c2-46af-881d-7ea6ff3b2e88'::uuid, '6ff1b1ca-44b7-4113-93e5-a72293a817c3'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('a580fd3b-9f01-486a-859c-5b08c183f602'::uuid, '6571db82-42d2-4c3a-884e-4ad43b1b912d'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('f810fe38-5efd-455a-83f8-7e964423806e'::uuid, '8eea060c-1325-42af-b536-5268ecf89273'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('580388cf-ffa5-40b2-a35e-3e9c7cb82d20'::uuid, '79095544-7041-4c36-a6b1-d1f5516f943b'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('01edf710-63c0-4af4-8e9e-c67756a12e62'::uuid, '6f574ba1-fd77-42b0-b6c0-c93334ecaba3'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('ed522b52-52ab-4cf2-af37-5949e5a3b095'::uuid, '4e77847e-3cf3-42e0-bd6a-d4d678275dce'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('ba8106d2-9221-49be-83c5-c2f85c7c299d'::uuid, '9d18b990-a540-4f75-980a-567c7c18e08f'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('8a202e36-977a-4faf-8475-a7a182e01781'::uuid, 'f1a26893-4fab-4436-9272-06f544c03e70'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('716aab78-a06a-412b-8fee-4d4e880a4caf'::uuid, '262057e2-8bd8-47f8-a2c6-451abee35a93'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('583a7ec3-50c9-4574-ab86-4b2845f14dd2'::uuid, '644e13e2-31c1-43e8-8e5c-29252b5e7340'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('1a1e5cbe-6d56-4d85-9edb-c56339deb2de'::uuid, 'c3b53599-3505-4094-8785-c35068b6210a'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('9abfa60d-bb72-4c47-82c5-1f9fba8a5738'::uuid, 'ce8dc336-3214-4bfc-b8c0-c3d973f7f725'::uuid, '7bf1380e-e53f-44ec-957b-bd9189a1eadf'::uuid),
    ('799c11d2-52f1-4aca-aedc-d48c57849a33'::uuid, 'f494bda1-8204-41c1-83f0-91b844d0c56c'::uuid, '7bf1380e-e53f-44ec-957b-bd9189a1eadf'::uuid),
    ('f0a8d53f-3855-43a9-927f-f2b104771a00'::uuid, '82b1e282-6f2a-4220-ab8f-a1342bcd11ea'::uuid, '7bf1380e-e53f-44ec-957b-bd9189a1eadf'::uuid),
    ('c7f40fa3-8c46-473d-a115-0c00e2f6c850'::uuid, 'f9fe7410-adfb-4359-9fe9-ff32a86f7e85'::uuid, '7bf1380e-e53f-44ec-957b-bd9189a1eadf'::uuid),
    ('c0943147-afd2-46cc-b215-43b0821fdbae'::uuid, '9c58ac27-b143-4e34-9f2e-953b134059ae'::uuid, '7bf1380e-e53f-44ec-957b-bd9189a1eadf'::uuid),
    ('537cb918-c2eb-4f7c-b4b5-1d973f911a89'::uuid, '20e216cb-4be1-4841-b9ae-db2b7a45be5b'::uuid, '7bf1380e-e53f-44ec-957b-bd9189a1eadf'::uuid),
    ('dbafa56d-11b2-4d86-9fde-ca578f9eb44b'::uuid, 'ceea46ce-6a43-47b1-b8c5-f54b9a0640d0'::uuid, 'd109bd2b-a707-4cac-9c44-51f0ffe6f4ea'::uuid),
    ('e07d6e19-20fd-4b93-8d18-6ecb2d020ecc'::uuid, '3a45f9e5-9c20-486c-8a18-aa6fddc37d4a'::uuid, 'd109bd2b-a707-4cac-9c44-51f0ffe6f4ea'::uuid),
    ('6a2b796b-c7d2-4e7b-98a6-6fcdfc0545d6'::uuid, '7ba35fb0-570e-4ca6-8616-7044d1dca0a3'::uuid, 'd109bd2b-a707-4cac-9c44-51f0ffe6f4ea'::uuid),
    ('698d87cc-5bcf-4fde-9c89-3b9c62634827'::uuid, 'e87b0698-df63-4ce9-b041-1b7858d6ed91'::uuid, 'd109bd2b-a707-4cac-9c44-51f0ffe6f4ea'::uuid),
    ('9635f02c-cd38-4701-b742-45855c5e70b5'::uuid, 'c517bf10-355b-49a8-a8bc-dffd2dc7a249'::uuid, '0e1f3603-f6cf-4df1-9a15-d4f1a9914c24'::uuid),
    ('bd7a5ffd-e949-495b-8c3c-b810d9a77f5d'::uuid, '926c2789-1b03-4a5b-8839-eb3f92e512f9'::uuid, '0e1f3603-f6cf-4df1-9a15-d4f1a9914c24'::uuid),
    ('9c9dda90-59fc-420f-99a4-25bb289b1e55'::uuid, 'a2805873-6db2-4545-9f1c-dbfa4050aaac'::uuid, '0e1f3603-f6cf-4df1-9a15-d4f1a9914c24'::uuid),
    ('a69cd2f3-371c-4a1d-86b4-7eeb8dde3122'::uuid, '13f0525c-56bd-4ac3-aa0d-fb84ecf23103'::uuid, 'd0c50633-8c19-4344-a19f-e0430c88a687'::uuid),
    ('b0e01422-e16f-45d1-8f09-ed89b0783742'::uuid, '09a2fed0-0803-4e63-b6a9-dbe61a8fee62'::uuid, '64a42ba2-7431-463b-b0e2-d519d5e2e61f'::uuid)
) as v(link_id, eco_id, maydai_id)
where exists (select 1 from public.ecologits_models e where e.id = v.eco_id)
  and exists (select 1 from public.compl_ai_models m where m.id = v.maydai_id)
  and not exists (
    select 1
    from public.ecologits_model_links l
    where l.id = v.link_id
       or l.ecologits_model_id = v.eco_id
  );

-- E. Alias ecologits : recréés s'ils ont été purgés, ou ramenés à la fiche d'origine.
-- L'identité stable est (source, source_id). Le nom vient du catalogue EcoLogits.

insert into public.llm_model_aliases (
  model_id, source, source_id, raw_name, normalized_name, match_method
)
select
  v.maydai_id,
  'ecologits',
  e.id::text,
  e.name,
  coalesce(e.normalized_name, public.normalize_llm_model_slug(e.name), e.name),
  'manual'
from (
  values
    ('f76d1343-fdab-4656-a92b-8d00f39583b8'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('6ff1b1ca-44b7-4113-93e5-a72293a817c3'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('6571db82-42d2-4c3a-884e-4ad43b1b912d'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('8eea060c-1325-42af-b536-5268ecf89273'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('79095544-7041-4c36-a6b1-d1f5516f943b'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('6f574ba1-fd77-42b0-b6c0-c93334ecaba3'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('4e77847e-3cf3-42e0-bd6a-d4d678275dce'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('9d18b990-a540-4f75-980a-567c7c18e08f'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('f1a26893-4fab-4436-9272-06f544c03e70'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('262057e2-8bd8-47f8-a2c6-451abee35a93'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('644e13e2-31c1-43e8-8e5c-29252b5e7340'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('c3b53599-3505-4094-8785-c35068b6210a'::uuid, '7d8b3111-8711-4dd4-85f5-def0e93c7f20'::uuid),
    ('ce8dc336-3214-4bfc-b8c0-c3d973f7f725'::uuid, '7bf1380e-e53f-44ec-957b-bd9189a1eadf'::uuid),
    ('f494bda1-8204-41c1-83f0-91b844d0c56c'::uuid, '7bf1380e-e53f-44ec-957b-bd9189a1eadf'::uuid),
    ('82b1e282-6f2a-4220-ab8f-a1342bcd11ea'::uuid, '7bf1380e-e53f-44ec-957b-bd9189a1eadf'::uuid),
    ('f9fe7410-adfb-4359-9fe9-ff32a86f7e85'::uuid, '7bf1380e-e53f-44ec-957b-bd9189a1eadf'::uuid),
    ('9c58ac27-b143-4e34-9f2e-953b134059ae'::uuid, '7bf1380e-e53f-44ec-957b-bd9189a1eadf'::uuid),
    ('20e216cb-4be1-4841-b9ae-db2b7a45be5b'::uuid, '7bf1380e-e53f-44ec-957b-bd9189a1eadf'::uuid),
    ('ceea46ce-6a43-47b1-b8c5-f54b9a0640d0'::uuid, 'd109bd2b-a707-4cac-9c44-51f0ffe6f4ea'::uuid),
    ('3a45f9e5-9c20-486c-8a18-aa6fddc37d4a'::uuid, 'd109bd2b-a707-4cac-9c44-51f0ffe6f4ea'::uuid),
    ('7ba35fb0-570e-4ca6-8616-7044d1dca0a3'::uuid, 'd109bd2b-a707-4cac-9c44-51f0ffe6f4ea'::uuid),
    ('e87b0698-df63-4ce9-b041-1b7858d6ed91'::uuid, 'd109bd2b-a707-4cac-9c44-51f0ffe6f4ea'::uuid),
    ('c517bf10-355b-49a8-a8bc-dffd2dc7a249'::uuid, '0e1f3603-f6cf-4df1-9a15-d4f1a9914c24'::uuid),
    ('926c2789-1b03-4a5b-8839-eb3f92e512f9'::uuid, '0e1f3603-f6cf-4df1-9a15-d4f1a9914c24'::uuid),
    ('a2805873-6db2-4545-9f1c-dbfa4050aaac'::uuid, '0e1f3603-f6cf-4df1-9a15-d4f1a9914c24'::uuid),
    ('5685419e-a06d-4f80-8144-43191a804e86'::uuid, '0e1f3603-f6cf-4df1-9a15-d4f1a9914c24'::uuid),
    ('edc937f9-78fc-403c-9d5c-8ccb535a27c3'::uuid, '0e1f3603-f6cf-4df1-9a15-d4f1a9914c24'::uuid),
    ('13f0525c-56bd-4ac3-aa0d-fb84ecf23103'::uuid, 'd0c50633-8c19-4344-a19f-e0430c88a687'::uuid),
    ('c109eb5f-108c-4512-b181-b05f59908414'::uuid, 'd0c50633-8c19-4344-a19f-e0430c88a687'::uuid),
    ('09a2fed0-0803-4e63-b6a9-dbe61a8fee62'::uuid, '64a42ba2-7431-463b-b0e2-d519d5e2e61f'::uuid),
    ('2e39eb29-0280-424c-b560-2a8d7cb236d2'::uuid, '64a42ba2-7431-463b-b0e2-d519d5e2e61f'::uuid)
) as v(eco_id, maydai_id)
join public.ecologits_models e on e.id = v.eco_id
where exists (select 1 from public.compl_ai_models m where m.id = v.maydai_id)
  and exists (
    select 1
    from public.ecologits_model_links l
    where l.ecologits_model_id = e.id
      and l.maydai_model_id = v.maydai_id
  )
on conflict (source, source_id) do update
set model_id = excluded.model_id,
    raw_name = excluded.raw_name,
    normalized_name = excluded.normalized_name,
    match_method = excluded.match_method;

update public.ecologits_models em
set link_status = 'matched',
    updated_at = now()
where em.id in (
  'f76d1343-fdab-4656-a92b-8d00f39583b8',
  '6ff1b1ca-44b7-4113-93e5-a72293a817c3',
  '6571db82-42d2-4c3a-884e-4ad43b1b912d',
  '8eea060c-1325-42af-b536-5268ecf89273',
  '79095544-7041-4c36-a6b1-d1f5516f943b',
  '6f574ba1-fd77-42b0-b6c0-c93334ecaba3',
  '4e77847e-3cf3-42e0-bd6a-d4d678275dce',
  '9d18b990-a540-4f75-980a-567c7c18e08f',
  'f1a26893-4fab-4436-9272-06f544c03e70',
  '262057e2-8bd8-47f8-a2c6-451abee35a93',
  '644e13e2-31c1-43e8-8e5c-29252b5e7340',
  'c3b53599-3505-4094-8785-c35068b6210a',
  'ce8dc336-3214-4bfc-b8c0-c3d973f7f725',
  'f494bda1-8204-41c1-83f0-91b844d0c56c',
  '82b1e282-6f2a-4220-ab8f-a1342bcd11ea',
  'f9fe7410-adfb-4359-9fe9-ff32a86f7e85',
  '9c58ac27-b143-4e34-9f2e-953b134059ae',
  '20e216cb-4be1-4841-b9ae-db2b7a45be5b',
  'ceea46ce-6a43-47b1-b8c5-f54b9a0640d0',
  '3a45f9e5-9c20-486c-8a18-aa6fddc37d4a',
  '7ba35fb0-570e-4ca6-8616-7044d1dca0a3',
  'e87b0698-df63-4ce9-b041-1b7858d6ed91',
  'c517bf10-355b-49a8-a8bc-dffd2dc7a249',
  '926c2789-1b03-4a5b-8839-eb3f92e512f9',
  'a2805873-6db2-4545-9f1c-dbfa4050aaac',
  '5685419e-a06d-4f80-8144-43191a804e86',
  'edc937f9-78fc-403c-9d5c-8ccb535a27c3',
  '13f0525c-56bd-4ac3-aa0d-fb84ecf23103',
  'c109eb5f-108c-4512-b181-b05f59908414',
  '09a2fed0-0803-4e63-b6a9-dbe61a8fee62',
  '2e39eb29-0280-424c-b560-2a8d7cb236d2'
)
and exists (
  select 1 from public.ecologits_model_links l where l.ecologits_model_id = em.id
);

-- F. Alias EcoLogits orphelins observés sur 354120aa avant la purge du UP.
-- mistral-medium-3.5, mistral-medium et mistral-medium-latest n'avaient pas de lien.

insert into public.llm_model_aliases (
  id, model_id, source, source_id, raw_name, normalized_name, match_method
)
values
  (
    '121ae1d2-54c5-4e4c-baf7-20a631a05b12',
    '354120aa-a79e-4b6c-a501-c2e20226f327',
    'ecologits',
    'a89d4ca8-ae89-48d8-b88b-572c411e6ed9',
    'mistral-medium-3.5',
    'mistralmedium35',
    'manual'
  ),
  (
    '28228fc4-99c8-442a-a0e1-7e92f6de1e1f',
    '354120aa-a79e-4b6c-a501-c2e20226f327',
    'ecologits',
    'e016fe80-8c9d-4f0d-9f9a-cfa7f904d913',
    'mistral-medium',
    'mistralmedium',
    'manual'
  ),
  (
    '5fab8d1c-c57c-4af4-b9a8-7d5c813ab077',
    '354120aa-a79e-4b6c-a501-c2e20226f327',
    'ecologits',
    'e526a3f0-a362-4a26-ab47-2ff1f2ee9d65',
    'mistral-medium-latest',
    'mistralmediumlatest',
    'manual'
  )
on conflict (source, source_id) do update
set model_id = excluded.model_id,
    raw_name = excluded.raw_name,
    normalized_name = excluded.normalized_name,
    match_method = excluded.match_method;

commit;
