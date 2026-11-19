begin;

alter table public.compl_ai_models
  add column if not exists llm_stats_id text;

create unique index if not exists compl_ai_models_llm_stats_id_unique
  on public.compl_ai_models (llm_stats_id)
  where llm_stats_id is not null;

create temporary table llm_stats_model_merges (
  duplicate_id uuid primary key,
  canonical_id uuid not null
) on commit drop;

with normalized_models as (
  select
    id,
    created_at,
    case regexp_replace(lower(model_name), '[^a-z0-9]', '', 'g')
      when 'claude37sonnet' then 'claudesonnet37'
      when 'claude3opus' then 'claudeopus3'
      else regexp_replace(lower(model_name), '[^a-z0-9]', '', 'g')
    end as normalized_name,
    case
      when model_provider_id in (9, 27) then 'qwen'
      when model_provider_id in (6, 20) then 'mistral'
      when model_provider_id in (7, 18) then 'nvidia'
      else regexp_replace(lower(coalesce(model_provider, '')), '[^a-z0-9]', '', 'g')
    end as normalized_provider
  from public.compl_ai_models
),
historical_models as (
  select distinct on (normalized_provider, normalized_name)
    id,
    normalized_provider,
    normalized_name
  from normalized_models
  where created_at < timestamptz '2026-07-11 00:00:00+00'
  order by normalized_provider, normalized_name, created_at, id
)
insert into llm_stats_model_merges (duplicate_id, canonical_id)
select imported.id, historical.id
from normalized_models imported
join historical_models historical
  using (normalized_provider, normalized_name)
where imported.created_at >= timestamptz '2026-07-11 00:00:00+00'
  and imported.id <> historical.id;

-- Les références connues sont déplacées avant la suppression des doublons.
update public.usecases target
set primary_model_id = merges.canonical_id
from llm_stats_model_merges merges
where target.primary_model_id = merges.duplicate_id;

update public.compl_ai_evaluations target
set model_id = merges.canonical_id
from llm_stats_model_merges merges
where target.model_id = merges.duplicate_id;

update public.eco_evaluations target
set model_id = merges.canonical_id
from llm_stats_model_merges merges
where target.model_id = merges.duplicate_id;

update public.eco_evaluations_aggregated target
set model_id = merges.canonical_id
from llm_stats_model_merges merges
where target.model_id = merges.duplicate_id;

-- Refuse une suppression si une nouvelle clé étrangère a été ajoutée sans être
-- prise en charge ci-dessus.
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
      'select count(*) from %I.%I where %I in (select duplicate_id from llm_stats_model_merges)',
      foreign_key.schema_name,
      foreign_key.table_name,
      foreign_key.column_name
    ) into remaining_references;

    if remaining_references > 0 then
      raise exception
        'Fusion LLM Stats interrompue: % référence(s) restante(s) dans %.%.%',
        remaining_references,
        foreign_key.schema_name,
        foreign_key.table_name,
        foreign_key.column_name;
    end if;
  end loop;
end
$$;

-- Conserve les métadonnées LLM Stats les plus récentes sur le modèle MaydAI
-- historique, tout en préservant son identité et ses libellés éditoriaux.
update public.compl_ai_models canonical
set
  llm_stats_id = coalesce(imported.llm_stats_id, canonical.llm_stats_id),
  model_type = imported.model_type,
  license = imported.license,
  context_length = imported.context_length,
  release_date = imported.release_date,
  knowledge_cutoff = imported.knowledge_cutoff,
  input_cost_per_million = imported.input_cost_per_million,
  output_cost_per_million = imported.output_cost_per_million,
  model_size = imported.model_size,
  gpqa_score = imported.gpqa_score,
  aime_2025_score = imported.aime_2025_score,
  llm_leader_rank = imported.llm_leader_rank,
  updated_at = greatest(canonical.updated_at, imported.updated_at)
from llm_stats_model_merges merges
join public.compl_ai_models imported on imported.id = merges.duplicate_id
where canonical.id = merges.canonical_id;

delete from public.compl_ai_models duplicate
using llm_stats_model_merges merges
where duplicate.id = merges.duplicate_id;

notify pgrst, 'reload schema';

commit;
