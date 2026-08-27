-- Phase 1 d'assainissement LLM :
-- 1) fusion des 14 doublons de nommage dans compl_ai_models
-- 2) unification des providers aliasés vers les noms canoniques du sync LLM Stats
-- 3) colonne slug normalisée, UNIQUE NOT NULL

create or replace function public.normalize_llm_model_slug(input text)
returns text
language sql
immutable
strict
set search_path = public
as $$
  select nullif(
    trim(both '-' from regexp_replace(
      regexp_replace(lower(trim(input)), '[^a-z0-9]+', '-', 'g'),
      '-+', '-', 'g'
    )),
    ''
  );
$$;

comment on function public.normalize_llm_model_slug(text) is
  'Slug strict : minuscules, caractères non alphanumériques → tiret, tirets multiples collapsés.';

create table if not exists public._llm_model_merges_tmp (
  duplicate_id uuid primary key,
  canonical_id uuid not null
);

-- Conservé = fiche la plus complète (évaluations COMPL-AI, puis cas d'usage).
-- Doublon = import LLM Stats du 26 août (Title Case / autre provider_id).
insert into public._llm_model_merges_tmp (duplicate_id, canonical_id) values
  ('a038651f-e010-4ee8-ad7b-03890192710a', '6c3a7049-b6c4-436e-b5cf-83ecd7c968c6'), -- gpt-5.2
  ('71d871ac-ffd6-4373-9fea-b466d3ed5068', '866551a3-65a5-41cb-b3e7-cd39292c6ac5'), -- magistral-medium
  ('073b976d-ef13-4f04-a4eb-2421a71e5943', '64a42ba2-7431-463b-b0e2-d519d5e2e61f'), -- magistral-small-2506
  ('4b8f564d-f644-4fae-bef6-452cdf38a3d4', 'e682f260-792a-477e-83c5-b2ec373a6003'), -- Mistral Small 4
  ('b074da10-ab05-4f01-bce3-47a3f4525acc', 'e6e74ba3-91b7-43d8-9303-d86e55dd600f'), -- qwen2.5-14b-instruct
  ('5a7b2bc9-5380-4b80-ad0c-4ba9fa73ae44', '32eb763f-b1e9-4d02-b273-a82f0cbbb605'), -- qwen2.5-32b-instruct
  ('1eb4414a-ba77-4041-a025-5d832840455c', '58a76f7c-77f0-4e48-ad82-a9c18bea253a'), -- qwen2.5-72b-instruct
  ('135e441d-b627-48c8-95e6-35b8fa2e8e65', 'f47b12fc-07c2-4d23-9706-ee0c2c9bb285'), -- qwen2.5-vl-32b-instruct
  ('d8b3c572-2814-4f1a-acde-3bd43510137a', 'c53b06ab-9723-4761-8f09-900a9e553fc5'), -- qwen3-235b-a22b
  ('294fbedb-9683-46fa-9223-56cf101e1d17', '8295a5b0-c535-4025-9017-9820d2b2c962'), -- qwen3-30b-a3b
  ('b3d16562-286a-45c8-9193-b756fd288db0', '85325d32-e37a-44c4-9877-0e292b552fd1'), -- qwen3-32b
  ('87b7d603-c819-4209-893b-ffa1ef56403f', '21ee73db-b03d-4610-9b84-26e2a187769b'), -- qwen3-vl-4b-thinking
  ('7ae2c73b-cf06-443c-9d0b-c4ed3a394685', '623b74f3-eb36-4348-baad-2a47fb776d7c'), -- qwen3-vl-8b-thinking
  ('077a25c6-8273-46ee-8e52-60d067b1eec7', 'a4c7c173-27bf-4d36-b1e0-5cf42e9f6acc'); -- qwq-32b

-- Lignes aggregated identiques (même région/méthode/mode) : on garde celle du canonique.
delete from public.eco_evaluations_aggregated duplicate
using public._llm_model_merges_tmp merges
join public.eco_evaluations_aggregated canonical
  on canonical.model_id = merges.canonical_id
where duplicate.model_id = merges.duplicate_id
  and duplicate.region_code = canonical.region_code
  and duplicate.methodology_version_id = canonical.methodology_version_id
  and duplicate.mode = canonical.mode;

update public.usecases target
set primary_model_id = merges.canonical_id
from public._llm_model_merges_tmp merges
where target.primary_model_id = merges.duplicate_id;

update public.compl_ai_evaluations target
set model_id = merges.canonical_id
from public._llm_model_merges_tmp merges
where target.model_id = merges.duplicate_id;

update public.eco_evaluations target
set model_id = merges.canonical_id
from public._llm_model_merges_tmp merges
where target.model_id = merges.duplicate_id;

update public.eco_evaluations_aggregated target
set model_id = merges.canonical_id
from public._llm_model_merges_tmp merges
where target.model_id = merges.duplicate_id;

update public.ecologits_model_links target
set maydai_model_id = merges.canonical_id,
    updated_at = now()
from public._llm_model_merges_tmp merges
where target.maydai_model_id = merges.duplicate_id;

update public.comparia_models target
set maydai_model_id = merges.canonical_id,
    updated_at = now()
from public._llm_model_merges_tmp merges
where target.maydai_model_id = merges.duplicate_id;

do $$
declare
  foreign_key record;
  remaining_references bigint;
begin
  for foreign_key in
    select
      child_namespace.nspname as schema_name,
      child.relname as table_name,
      child_column.attname as column_name
    from pg_constraint constraint_row
    join pg_class parent on parent.oid = constraint_row.confrelid
    join pg_namespace parent_namespace on parent_namespace.oid = parent.relnamespace
    join pg_class child on child.oid = constraint_row.conrelid
    join pg_namespace child_namespace on child_namespace.oid = child.relnamespace
    join unnest(constraint_row.conkey) with ordinality child_key(attnum, position) on true
    join unnest(constraint_row.confkey) with ordinality parent_key(attnum, position)
      on parent_key.position = child_key.position
    join pg_attribute child_column
      on child_column.attrelid = child.oid and child_column.attnum = child_key.attnum
    join pg_attribute parent_column
      on parent_column.attrelid = parent.oid and parent_column.attnum = parent_key.attnum
    where constraint_row.contype = 'f'
      and parent_namespace.nspname = 'public'
      and parent.relname = 'compl_ai_models'
      and parent_column.attname = 'id'
  loop
    execute format(
      'select count(*) from %I.%I where %I in (select duplicate_id from public._llm_model_merges_tmp)',
      foreign_key.schema_name,
      foreign_key.table_name,
      foreign_key.column_name
    ) into remaining_references;

    if remaining_references > 0 then
      raise exception
        'Fusion modèles interrompue: % référence(s) restante(s) dans %.%.%',
        remaining_references,
        foreign_key.schema_name,
        foreign_key.table_name,
        foreign_key.column_name;
    end if;
  end loop;
end
$$;

-- Libère l'unicité partielle llm_stats_id avant copie : le doublon et le
-- canonique ne peuvent pas porter la même valeur en même temps.
alter table public._llm_model_merges_tmp
  add column if not exists llm_stats_id text;

update public._llm_model_merges_tmp merges
set llm_stats_id = imported.llm_stats_id
from public.compl_ai_models imported
where imported.id = merges.duplicate_id;

update public.compl_ai_models duplicate
set llm_stats_id = null
from public._llm_model_merges_tmp merges
where duplicate.id = merges.duplicate_id
  and duplicate.llm_stats_id is not null;

-- Transfère les attributs LLM Stats du doublon vers la fiche conservée.
update public.compl_ai_models canonical
set
  llm_stats_id = coalesce(canonical.llm_stats_id, merges.llm_stats_id),
  model_type = coalesce(canonical.model_type, imported.model_type),
  license = coalesce(canonical.license, imported.license),
  context_length = coalesce(canonical.context_length, imported.context_length),
  release_date = coalesce(canonical.release_date, imported.release_date),
  knowledge_cutoff = coalesce(canonical.knowledge_cutoff, imported.knowledge_cutoff),
  input_cost_per_million = coalesce(canonical.input_cost_per_million, imported.input_cost_per_million),
  output_cost_per_million = coalesce(canonical.output_cost_per_million, imported.output_cost_per_million),
  model_size = coalesce(canonical.model_size, imported.model_size),
  gpqa_score = coalesce(canonical.gpqa_score, imported.gpqa_score),
  aime_2025_score = coalesce(canonical.aime_2025_score, imported.aime_2025_score),
  llm_leader_rank = coalesce(canonical.llm_leader_rank, imported.llm_leader_rank),
  comparia_rank = coalesce(canonical.comparia_rank, imported.comparia_rank),
  updated_at = greatest(canonical.updated_at, imported.updated_at)
from public._llm_model_merges_tmp merges
join public.compl_ai_models imported on imported.id = merges.duplicate_id
where canonical.id = merges.canonical_id;

delete from public.compl_ai_models duplicate
using public._llm_model_merges_tmp merges
where duplicate.id = merges.duplicate_id;

drop table public._llm_model_merges_tmp;

-- Hérite l'icône Nvidia (7, 0 modèle) vers NVIDIA (18) avant suppression.
update public.model_providers canonical
set
  icon_url = coalesce(canonical.icon_url, discarded.icon_url),
  tooltip_title = coalesce(canonical.tooltip_title, discarded.tooltip_title),
  tooltip_short_content = coalesce(canonical.tooltip_short_content, discarded.tooltip_short_content),
  tooltip_full_content = coalesce(canonical.tooltip_full_content, discarded.tooltip_full_content),
  tooltip_icon = coalesce(canonical.tooltip_icon, discarded.tooltip_icon)
from public.model_providers discarded
where canonical.id = 18
  and discarded.id = 7;

do $$
declare
  colliding_names integer;
begin
  select count(*) into colliding_names
  from (
    select model_name
    from public.compl_ai_models
    where model_provider_id in (6, 20)
    group by model_name
    having count(*) > 1
  ) collisions;

  if colliding_names > 0 then
    raise exception
      'Fusion providers Mistral interrompue: % nom(s) en collision après dédoublonnage',
      colliding_names;
  end if;

  select count(*) into colliding_names
  from (
    select model_name
    from public.compl_ai_models
    where model_provider_id in (9, 27)
    group by model_name
    having count(*) > 1
  ) collisions;

  if colliding_names > 0 then
    raise exception
      'Fusion providers Qwen interrompue: % nom(s) en collision après dédoublonnage',
      colliding_names;
  end if;
end
$$;

-- Noms canoniques = ceux déjà utilisés par canonicalLlmStatsProviderName().
update public.compl_ai_models
set model_provider_id = 6, model_provider = 'Mistral', updated_at = now()
where model_provider_id = 20;

update public.compl_ai_models
set model_provider_id = 9, model_provider = 'Qwen', updated_at = now()
where model_provider_id = 27;

update public.compl_ai_models
set model_provider = 'Mistral', updated_at = now()
where model_provider_id = 6 and model_provider is distinct from 'Mistral';

update public.compl_ai_models
set model_provider = 'Qwen', updated_at = now()
where model_provider_id = 9 and model_provider is distinct from 'Qwen';

update public.compl_ai_models
set model_provider = 'NVIDIA', updated_at = now()
where model_provider_id = 18 and model_provider is distinct from 'NVIDIA';

delete from public.model_providers
where id in (7, 20, 27);

alter table public.compl_ai_models
  add column if not exists slug text;

update public.compl_ai_models
set slug = public.normalize_llm_model_slug(model_name)
where slug is null;

do $$
declare
  duplicate_slugs integer;
  empty_slugs integer;
begin
  select count(*) into empty_slugs
  from public.compl_ai_models
  where slug is null or btrim(slug) = '';

  if empty_slugs > 0 then
    raise exception 'Slug: % ligne(s) sans slug après normalisation', empty_slugs;
  end if;

  select count(*) into duplicate_slugs
  from (
    select slug
    from public.compl_ai_models
    group by slug
    having count(*) > 1
  ) collisions;

  if duplicate_slugs > 0 then
    raise exception 'Slug: % valeur(s) encore dupliquée(s), contrainte UNIQUE refusée', duplicate_slugs;
  end if;
end
$$;

alter table public.compl_ai_models
  alter column slug set not null;

create unique index if not exists compl_ai_models_slug_key
  on public.compl_ai_models (slug);

comment on column public.compl_ai_models.slug is
  'Identifiant normalisé du modèle (minuscules, tirets). Unique. Recalculé à chaque changement de model_name.';

create or replace function public.set_compl_ai_models_slug()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.slug := public.normalize_llm_model_slug(new.model_name);
  if new.slug is null then
    raise exception 'Impossible de calculer un slug pour model_name=%', new.model_name;
  end if;
  return new;
end;
$$;

drop trigger if exists compl_ai_models_set_slug on public.compl_ai_models;
create trigger compl_ai_models_set_slug
  before insert or update of model_name, slug
  on public.compl_ai_models
  for each row
  execute function public.set_compl_ai_models_slug();

notify pgrst, 'reload schema';
