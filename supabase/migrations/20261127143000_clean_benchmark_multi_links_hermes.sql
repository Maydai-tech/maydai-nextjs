-- Nettoyage Hermès du 27/11/2026 : familles EcoLogits multi-liens
-- et consolidation des files unmatched EcoLogits / Compar:IA.
-- Ne modifie pas usecases, usecase_responses, usecase_history,
-- score_base, score_model, score_final, ni compl_ai_models
-- (role, lifecycle_status, rang Compar:IA).
-- magistral-small-2509 vérifié en base :
-- 2e39eb29-0280-424c-b560-2a8d7cb236d2
-- (le fragment 0280-4280 ne correspond à aucune ligne).

begin;

-- 1. Détacher les liens EcoLogits pollués : alias, puis lien, puis ignored.
-- Les liens conservés (Command R+, Command A+, Mistral-7B-Instruct-v0.2,
-- Mistral-7B-v0.3 déjà sur mistral-7b-v0-3) ne figurent pas dans cette liste.

delete from public.llm_model_aliases a
where a.source = 'ecologits'
  and a.source_id in (
    select em.id::text
    from public.ecologits_models em
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
      '13f0525c-56bd-4ac3-aa0d-fb84ecf23103',
      '09a2fed0-0803-4e63-b6a9-dbe61a8fee62'
    )
  );

delete from public.ecologits_model_links l
where l.ecologits_model_id in (
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
  '13f0525c-56bd-4ac3-aa0d-fb84ecf23103',
  '09a2fed0-0803-4e63-b6a9-dbe61a8fee62'
);

update public.ecologits_models em
set link_status = 'ignored',
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
  '13f0525c-56bd-4ac3-aa0d-fb84ecf23103',
  '09a2fed0-0803-4e63-b6a9-dbe61a8fee62'
)
and exists (select 1 from public.ecologits_models present where present.id = em.id)
and not exists (
  select 1
  from public.ecologits_model_links l
  where l.ecologits_model_id = em.id
);

-- 2. Réaffectations et rattachements. ON CONFLICT (ecologits_model_id)
-- laisse passer un clic admin déjà posé sur la même cible.
-- Mistral Medium 3.5 (354120aa) reçoit les 3 liens officiels :
-- mistral-medium-3-5, mistral-medium-3.5 et mistral-medium-2604.

insert into public.ecologits_model_links (ecologits_model_id, maydai_model_id, match_method)
select v.eco_id, v.maydai_id, 'manual'
from (
  values
    ('5685419e-a06d-4f80-8144-43191a804e86'::uuid, 'f62d2ec4-bea7-44c1-91bf-7de043855541'::uuid),
    ('edc937f9-78fc-403c-9d5c-8ccb535a27c3'::uuid, 'f62d2ec4-bea7-44c1-91bf-7de043855541'::uuid),
    ('c109eb5f-108c-4512-b181-b05f59908414'::uuid, '80a712c2-dead-4647-ac8c-59604cecef9c'::uuid),
    ('2e39eb29-0280-424c-b560-2a8d7cb236d2'::uuid, '5d2063c3-7a5c-441c-b5ec-1f3cb81fe4ec'::uuid),
    ('69a3842d-be4a-4d93-af37-40c55663d723'::uuid, 'f71d67fe-e6e3-406b-afc1-925e046cd28d'::uuid),
    ('0e803c5f-c6ff-4362-92a7-b26cdaa58ca2'::uuid, 'e1bd2070-b5a1-48bf-a53d-cbebfb11fc20'::uuid),
    ('65969697-e0b7-4eb1-870e-0dade1f8a1f6'::uuid, 'eeb8fee9-ce86-4484-926a-d10cbf3593bc'::uuid),
    ('82b34b7d-2f84-4619-a0bd-7bdc16525f95'::uuid, '66961047-b90d-4748-8c83-4a01e7e1b467'::uuid),
    ('b4b06caa-41ab-404b-bf74-3dff34d54407'::uuid, '354120aa-a79e-4b6c-a501-c2e20226f327'::uuid),
    ('b47df4f9-2de7-4245-a49f-1086f12ad4f4'::uuid, '354120aa-a79e-4b6c-a501-c2e20226f327'::uuid),
    ('a89d4ca8-ae89-48d8-b88b-572c411e6ed9'::uuid, '354120aa-a79e-4b6c-a501-c2e20226f327'::uuid)
) as v(eco_id, maydai_id)
where exists (select 1 from public.ecologits_models e where e.id = v.eco_id)
  and exists (select 1 from public.compl_ai_models m where m.id = v.maydai_id)
on conflict (ecologits_model_id) do update
set maydai_model_id = excluded.maydai_model_id,
    match_method = excluded.match_method,
    updated_at = now();

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
    ('5685419e-a06d-4f80-8144-43191a804e86'::uuid, 'f62d2ec4-bea7-44c1-91bf-7de043855541'::uuid),
    ('edc937f9-78fc-403c-9d5c-8ccb535a27c3'::uuid, 'f62d2ec4-bea7-44c1-91bf-7de043855541'::uuid),
    ('c109eb5f-108c-4512-b181-b05f59908414'::uuid, '80a712c2-dead-4647-ac8c-59604cecef9c'::uuid),
    ('2e39eb29-0280-424c-b560-2a8d7cb236d2'::uuid, '5d2063c3-7a5c-441c-b5ec-1f3cb81fe4ec'::uuid),
    ('69a3842d-be4a-4d93-af37-40c55663d723'::uuid, 'f71d67fe-e6e3-406b-afc1-925e046cd28d'::uuid),
    ('0e803c5f-c6ff-4362-92a7-b26cdaa58ca2'::uuid, 'e1bd2070-b5a1-48bf-a53d-cbebfb11fc20'::uuid),
    ('65969697-e0b7-4eb1-870e-0dade1f8a1f6'::uuid, 'eeb8fee9-ce86-4484-926a-d10cbf3593bc'::uuid),
    ('82b34b7d-2f84-4619-a0bd-7bdc16525f95'::uuid, '66961047-b90d-4748-8c83-4a01e7e1b467'::uuid),
    ('b4b06caa-41ab-404b-bf74-3dff34d54407'::uuid, '354120aa-a79e-4b6c-a501-c2e20226f327'::uuid),
    ('b47df4f9-2de7-4245-a49f-1086f12ad4f4'::uuid, '354120aa-a79e-4b6c-a501-c2e20226f327'::uuid),
    ('a89d4ca8-ae89-48d8-b88b-572c411e6ed9'::uuid, '354120aa-a79e-4b6c-a501-c2e20226f327'::uuid)
) as v(eco_id, maydai_id)
join public.ecologits_models e on e.id = v.eco_id
where exists (select 1 from public.compl_ai_models m where m.id = v.maydai_id)
on conflict (source, source_id) do update
set model_id = excluded.model_id,
    raw_name = excluded.raw_name,
    normalized_name = excluded.normalized_name,
    match_method = excluded.match_method;

update public.ecologits_models em
set link_status = 'matched',
    updated_at = now()
from (
  values
    ('5685419e-a06d-4f80-8144-43191a804e86'::uuid, 'f62d2ec4-bea7-44c1-91bf-7de043855541'::uuid),
    ('edc937f9-78fc-403c-9d5c-8ccb535a27c3'::uuid, 'f62d2ec4-bea7-44c1-91bf-7de043855541'::uuid),
    ('c109eb5f-108c-4512-b181-b05f59908414'::uuid, '80a712c2-dead-4647-ac8c-59604cecef9c'::uuid),
    ('2e39eb29-0280-424c-b560-2a8d7cb236d2'::uuid, '5d2063c3-7a5c-441c-b5ec-1f3cb81fe4ec'::uuid),
    ('69a3842d-be4a-4d93-af37-40c55663d723'::uuid, 'f71d67fe-e6e3-406b-afc1-925e046cd28d'::uuid),
    ('0e803c5f-c6ff-4362-92a7-b26cdaa58ca2'::uuid, 'e1bd2070-b5a1-48bf-a53d-cbebfb11fc20'::uuid),
    ('65969697-e0b7-4eb1-870e-0dade1f8a1f6'::uuid, 'eeb8fee9-ce86-4484-926a-d10cbf3593bc'::uuid),
    ('82b34b7d-2f84-4619-a0bd-7bdc16525f95'::uuid, '66961047-b90d-4748-8c83-4a01e7e1b467'::uuid),
    ('b4b06caa-41ab-404b-bf74-3dff34d54407'::uuid, '354120aa-a79e-4b6c-a501-c2e20226f327'::uuid),
    ('b47df4f9-2de7-4245-a49f-1086f12ad4f4'::uuid, '354120aa-a79e-4b6c-a501-c2e20226f327'::uuid),
    ('a89d4ca8-ae89-48d8-b88b-572c411e6ed9'::uuid, '354120aa-a79e-4b6c-a501-c2e20226f327'::uuid)
) as v(eco_id, maydai_id)
where em.id = v.eco_id
  and exists (
    select 1
    from public.ecologits_model_links l
    where l.ecologits_model_id = em.id
      and l.maydai_model_id = v.maydai_id
  );

-- 3. Les 21 orphelins EcoLogits restent ignorés seulement s'ils sont
-- encore unmatched. Un clic admin déjà matched n'est pas écrasé.

delete from public.llm_model_aliases a
using public.ecologits_models em
where a.source = 'ecologits'
  and a.source_id = em.id::text
  and em.link_status = 'unmatched'
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
  );

delete from public.ecologits_model_links l
using public.ecologits_models em
where l.ecologits_model_id = em.id
  and em.link_status = 'unmatched'
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
  );

update public.ecologits_models em
set link_status = 'ignored',
    updated_at = now()
where em.link_status = 'unmatched'
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
  and exists (select 1 from public.ecologits_models present where present.id = em.id);

-- 4. Compar:IA. ignored impose maydai_model_id et match_method nuls.
-- Le UNIQUE (maydai_model_id) empêche d'écraser une autre ligne déjà liée.

update public.comparia_models cm
set maydai_model_id = v.maydai_id,
    match_method = 'manual',
    link_status = 'matched',
    updated_at = now()
from (
  values
    ('claude-4-6-sonnet', '7c86055e-2359-42b6-8f2f-f2037a5b8d7b'::uuid),
    ('deepseek-v3-chat', 'fb5e1679-2bf2-4965-a87b-3c41253ed774'::uuid),
    ('llama-3.1-70b', '00b4cb5f-8e77-4288-ad6a-1958c1447acf'::uuid),
    ('mistral-nemo-2407', '44a9246e-4940-4dd4-964d-ad8341c2072f'::uuid),
    ('mistral-small-3.1-24b', '9b5a00a5-1b18-43bc-a80c-ad35056609a1'::uuid),
    ('claude-3-5-sonnet-v2', 'def84a6f-07b1-465e-ae57-836525b15407'::uuid),
    ('mixtral-8x22b-instruct-v0.1', '8ee07bde-eee6-4b3c-b206-8b10d550cd42'::uuid),
    ('mixtral-8x7b-instruct-v0.1', '8db9b242-4928-4b53-b3ab-c0177f282d1f'::uuid),
    ('hermes-3-llama-3.1-405b', '5cb112ec-c611-466c-b30d-05ae7335a1a2'::uuid)
) as v(source_id, maydai_id)
where cm.source_id = v.source_id
  and exists (select 1 from public.compl_ai_models m where m.id = v.maydai_id)
  and not exists (
    select 1
    from public.comparia_models other
    where other.maydai_model_id = v.maydai_id
      and other.source_id <> v.source_id
  );

insert into public.llm_model_source_ids (model_id, source, source_id, match_method)
select cm.maydai_model_id, 'comparia', cm.source_id, 'manual'
from public.comparia_models cm
where cm.link_status = 'matched'
  and cm.maydai_model_id is not null
  and cm.match_method is not null
  and (cm.source_id, cm.maydai_model_id) in (
    ('claude-4-6-sonnet', '7c86055e-2359-42b6-8f2f-f2037a5b8d7b'::uuid),
    ('deepseek-v3-chat', 'fb5e1679-2bf2-4965-a87b-3c41253ed774'::uuid),
    ('llama-3.1-70b', '00b4cb5f-8e77-4288-ad6a-1958c1447acf'::uuid),
    ('mistral-nemo-2407', '44a9246e-4940-4dd4-964d-ad8341c2072f'::uuid),
    ('mistral-small-3.1-24b', '9b5a00a5-1b18-43bc-a80c-ad35056609a1'::uuid),
    ('claude-3-5-sonnet-v2', 'def84a6f-07b1-465e-ae57-836525b15407'::uuid),
    ('mixtral-8x22b-instruct-v0.1', '8ee07bde-eee6-4b3c-b206-8b10d550cd42'::uuid),
    ('mixtral-8x7b-instruct-v0.1', '8db9b242-4928-4b53-b3ab-c0177f282d1f'::uuid),
    ('hermes-3-llama-3.1-405b', '5cb112ec-c611-466c-b30d-05ae7335a1a2'::uuid)
  )
on conflict (source, source_id) do update
set model_id = excluded.model_id,
    match_method = excluded.match_method,
    updated_at = now();

update public.comparia_models cm
set maydai_model_id = null,
    match_method = null,
    link_status = 'ignored',
    updated_at = now()
where cm.source_id in (
  'gemma-2-27b-it-q8',
  'aya-expanse-8b',
  'lfm-40b',
  'Yi-1.5-9B-Chat',
  'chocolatine-14b-instruct-dpo-v1.2-q4',
  'chocolatine-2-14b-instruct-v2.0.3-q8'
)
and exists (select 1 from public.comparia_models present where present.id = cm.id);

delete from public.llm_model_source_ids s
where s.source = 'comparia'
  and s.source_id in (
    'gemma-2-27b-it-q8',
    'aya-expanse-8b',
    'lfm-40b',
    'Yi-1.5-9B-Chat',
    'chocolatine-14b-instruct-dpo-v1.2-q4',
    'chocolatine-2-14b-instruct-v2.0.3-q8'
  )
  and exists (
    select 1
    from public.comparia_models cm
    where cm.source_id = s.source_id
      and cm.link_status = 'ignored'
      and cm.maydai_model_id is null
  );

-- 5. Alias EcoLogits : supprimer les orphelins, puis aligner model_id sur le lien.

delete from public.llm_model_aliases a
where a.source = 'ecologits'
  and not exists (
    select 1
    from public.ecologits_model_links eml
    where eml.ecologits_model_id::text = a.source_id
  );

update public.llm_model_aliases a
set model_id = eml.maydai_model_id
from public.ecologits_model_links eml
where a.source = 'ecologits'
  and eml.ecologits_model_id::text = a.source_id
  and eml.maydai_model_id <> a.model_id;

commit;
