begin;

create table if not exists public.comparia_models (
  id uuid primary key default gen_random_uuid(),
  source_id text not null unique,
  rank integer not null check (rank > 0),
  bradley_terry_score numeric not null,
  bt_p2_5 numeric,
  bt_p97_5 numeric,
  confidence_interval text,
  rank_p2_5 integer,
  rank_p97_5 integer,
  total_votes integer not null default 0 check (total_votes >= 0),
  consumption_mwh_per_1k_tokens numeric,
  size text,
  parameters_billions numeric,
  architecture text,
  release_date date,
  organisation text not null,
  license text,
  raw_payload jsonb not null default '{}'::jsonb,
  maydai_model_id uuid unique references public.compl_ai_models(id) on delete set null,
  match_method text check (match_method in ('exact', 'manual')),
  is_active boolean not null default true,
  last_imported_at timestamptz not null default now(),
  missing_since timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comparia_models_link_consistency check (
    (maydai_model_id is null and match_method is null)
    or (maydai_model_id is not null and match_method is not null)
  )
);

create index if not exists comparia_models_rank_idx
  on public.comparia_models (is_active, rank);
create index if not exists comparia_models_maydai_idx
  on public.comparia_models (maydai_model_id)
  where maydai_model_id is not null;

create table if not exists public.comparia_import_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('running', 'success', 'error')),
  file_name text,
  rows_received integer not null default 0 check (rows_received >= 0),
  rows_imported integer not null default 0 check (rows_imported >= 0),
  exact_links_created integer not null default 0 check (exact_links_created >= 0),
  models_deactivated integer not null default 0 check (models_deactivated >= 0),
  errors jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists comparia_import_runs_started_at_idx
  on public.comparia_import_runs (started_at desc);

alter table public.comparia_models enable row level security;
alter table public.comparia_import_runs enable row level security;

grant select on public.comparia_models to authenticated;
grant select on public.comparia_import_runs to authenticated;
grant select, insert, update, delete on public.comparia_models to service_role;
grant select, insert, update, delete on public.comparia_import_runs to service_role;

drop policy if exists comparia_models_select_admin on public.comparia_models;
create policy comparia_models_select_admin on public.comparia_models
  for select to authenticated
  using ((select public.is_admin_or_super_admin((select auth.uid()))));

drop policy if exists comparia_import_runs_select_admin on public.comparia_import_runs;
create policy comparia_import_runs_select_admin on public.comparia_import_runs
  for select to authenticated
  using ((select public.is_admin_or_super_admin((select auth.uid()))));

comment on table public.comparia_models is
  'Current Compar:IA model ranking imported from the Etalab licensed CSV export.';

notify pgrst, 'reload schema';
commit;
