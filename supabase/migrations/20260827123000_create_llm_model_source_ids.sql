-- Hub de mapping des identités sources (LLM Stats, EcoLogits, Compar:IA)
-- + backfill comparia_rankings → comparia_models.
-- Ne supprime pas llm_stats_id ni eco_* (encore lus par le code d'import).

create table if not exists public.llm_model_source_ids (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.compl_ai_models(id) on delete cascade,
  source text not null check (source in ('llm_stats', 'ecologits', 'comparia')),
  source_id text not null,
  match_method text not null check (match_method in ('exact', 'slug', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint llm_model_source_ids_source_source_id_key unique (source, source_id)
);

create index if not exists llm_model_source_ids_model_source_idx
  on public.llm_model_source_ids (model_id, source);

comment on table public.llm_model_source_ids is
  'Identifiants externes d''un modèle canonique MaydAI, une ligne par (source, source_id).';

alter table public.llm_model_source_ids enable row level security;

grant select on public.llm_model_source_ids to authenticated;
grant select, insert, update, delete on public.llm_model_source_ids to service_role;

drop policy if exists llm_model_source_ids_select_admin on public.llm_model_source_ids;
create policy llm_model_source_ids_select_admin on public.llm_model_source_ids
  for select to authenticated
  using ((select public.is_admin_or_super_admin((select auth.uid()))));

insert into public.llm_model_source_ids (model_id, source, source_id, match_method)
select id, 'llm_stats', llm_stats_id, 'exact'
from public.compl_ai_models
where llm_stats_id is not null
on conflict (source, source_id) do nothing;

insert into public.llm_model_source_ids (model_id, source, source_id, match_method)
select
  l.maydai_model_id,
  'ecologits',
  e.id::text,
  l.match_method
from public.ecologits_model_links l
join public.ecologits_models e on e.id = l.ecologits_model_id
on conflict (source, source_id) do nothing;

-- Backfill Compar:IA : catalogue neuf + liens uniques via llm_stats_id, slug ou nom.
with ranked as (
  select
    r.*,
    public.normalize_llm_model_slug(r.id) as id_slug,
    case
      when r.release ~ '^[0-9]{1,2}/[0-9]{2}$' then
        make_date(
          2000 + split_part(r.release, '/', 2)::integer,
          split_part(r.release, '/', 1)::integer,
          1
        )
      when r.release ~ '^[0-9]{4}-[0-9]{2}$' then
        make_date(
          split_part(r.release, '-', 1)::integer,
          split_part(r.release, '-', 2)::integer,
          1
        )
      else null
    end as parsed_release
  from public.comparia_rankings r
),
hub as (
  select
    m.id,
    m.model_name,
    m.slug,
    m.llm_stats_id
  from public.compl_ai_models m
),
matches as (
  select distinct on (r.id)
    r.id as source_id,
    h.id as model_id,
    case
      when h.llm_stats_id is not null and lower(h.llm_stats_id) = lower(r.id) then 'exact'
      when lower(h.model_name) = lower(r.id) then 'exact'
      else 'slug'
    end as match_method
  from ranked r
  join hub h
    on (h.llm_stats_id is not null and lower(h.llm_stats_id) = lower(r.id))
    or h.slug = r.id_slug
    or lower(h.model_name) = lower(r.id)
  order by
    r.id,
    case
      when h.llm_stats_id is not null and lower(h.llm_stats_id) = lower(r.id) then 0
      when lower(h.model_name) = lower(r.id) then 1
      else 2
    end,
    h.id
),
unique_model_matches as (
  select *
  from matches
  where model_id in (
    select model_id from matches group by model_id having count(*) = 1
  )
)
insert into public.comparia_models (
  source_id,
  rank,
  bradley_terry_score,
  bt_p2_5,
  bt_p97_5,
  confidence_interval,
  rank_p2_5,
  rank_p97_5,
  total_votes,
  consumption_mwh_per_1k_tokens,
  size,
  parameters_billions,
  architecture,
  release_date,
  organisation,
  license,
  raw_payload,
  maydai_model_id,
  match_method,
  is_active,
  last_imported_at,
  missing_since,
  created_at,
  updated_at
)
select
  r.id,
  r.rank,
  r.bradley_terry_score,
  r.bt_p2_5,
  r.bt_p97_5,
  nullif(r.confidence_interval, ''),
  case when r.rank_p2_5 is null then null else round(r.rank_p2_5)::integer end,
  case when r.rank_p97_5 is null then null else round(r.rank_p97_5)::integer end,
  r.total_votes,
  r.consumption_mwh,
  nullif(r.size, ''),
  r.parameters_b,
  nullif(r.architecture, ''),
  r.parsed_release,
  r.organisation,
  nullif(r.license, ''),
  to_jsonb(r) - 'id_slug' - 'parsed_release',
  um.model_id,
  case when um.model_id is null then null else 'exact' end,
  true,
  r.updated_at,
  null,
  r.updated_at,
  r.updated_at
from ranked r
left join unique_model_matches um on um.source_id = r.id
on conflict (source_id) do nothing;

insert into public.llm_model_source_ids (model_id, source, source_id, match_method)
select um.model_id, 'comparia', um.source_id, um.match_method
from (
  with ranked as (
    select r.id, public.normalize_llm_model_slug(r.id) as id_slug
    from public.comparia_rankings r
  ),
  hub as (
    select m.id, m.model_name, m.slug, m.llm_stats_id
    from public.compl_ai_models m
  ),
  matches as (
    select distinct on (r.id)
      r.id as source_id,
      h.id as model_id,
      case
        when h.llm_stats_id is not null and lower(h.llm_stats_id) = lower(r.id) then 'exact'
        when lower(h.model_name) = lower(r.id) then 'exact'
        else 'slug'
      end as match_method
    from ranked r
    join hub h
      on (h.llm_stats_id is not null and lower(h.llm_stats_id) = lower(r.id))
      or h.slug = r.id_slug
      or lower(h.model_name) = lower(r.id)
    order by
      r.id,
      case
        when h.llm_stats_id is not null and lower(h.llm_stats_id) = lower(r.id) then 0
        when lower(h.model_name) = lower(r.id) then 1
        else 2
      end,
      h.id
  )
  select * from matches
  where model_id in (select model_id from matches group by model_id having count(*) = 1)
) um
on conflict (source, source_id) do nothing;

update public.compl_ai_models canonical
set comparia_rank = cm.rank, updated_at = now()
from public.comparia_models cm
where cm.maydai_model_id = canonical.id
  and canonical.comparia_rank is distinct from cm.rank;

insert into public.comparia_import_runs (
  status,
  file_name,
  rows_received,
  rows_imported,
  exact_links_created,
  models_deactivated,
  errors,
  started_at,
  finished_at,
  duration_ms
)
select
  'success',
  'backfill:comparia_rankings',
  (select count(*) from public.comparia_rankings),
  (select count(*) from public.comparia_models),
  (select count(*) from public.comparia_models where maydai_model_id is not null),
  0,
  '[]'::jsonb,
  now(),
  now(),
  0;

do $$
declare
  llm_stats_hub integer;
  llm_stats_col integer;
  eco_hub integer;
  eco_links integer;
  comparia_catalog integer;
  comparia_legacy integer;
  comparia_hub integer;
begin
  select count(*) into llm_stats_hub from public.llm_model_source_ids where source = 'llm_stats';
  select count(*) into llm_stats_col from public.compl_ai_models where llm_stats_id is not null;
  if llm_stats_hub <> llm_stats_col then
    raise exception 'Backfill llm_stats incomplet: hub=%, colonne=%', llm_stats_hub, llm_stats_col;
  end if;

  select count(*) into eco_hub from public.llm_model_source_ids where source = 'ecologits';
  select count(*) into eco_links from public.ecologits_model_links;
  if eco_hub <> eco_links then
    raise exception 'Backfill ecologits incomplet: hub=%, liens=%', eco_hub, eco_links;
  end if;

  select count(*) into comparia_catalog from public.comparia_models;
  select count(*) into comparia_legacy from public.comparia_rankings;
  if comparia_catalog <> comparia_legacy then
    raise exception 'Backfill comparia_models incomplet: catalog=%, legacy=%', comparia_catalog, comparia_legacy;
  end if;

  select count(*) into comparia_hub from public.llm_model_source_ids where source = 'comparia';
  if comparia_hub <> (select count(*) from public.comparia_models where maydai_model_id is not null) then
    raise exception 'Backfill comparia hub incomplet: hub=%', comparia_hub;
  end if;
end
$$;

notify pgrst, 'reload schema';
