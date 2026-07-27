begin;

create table if not exists public.ecologits_models (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  name text not null,
  normalized_provider text not null,
  normalized_name text not null,
  architecture jsonb,
  sources jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  missing_since timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ecologits_models_provider_name_key unique (provider, name)
);

create index if not exists ecologits_models_active_provider_idx
  on public.ecologits_models (is_active, provider);
create index if not exists ecologits_models_normalized_idx
  on public.ecologits_models (normalized_provider, normalized_name);

create table if not exists public.ecologits_estimates (
  id uuid primary key default gen_random_uuid(),
  ecologits_model_id uuid not null references public.ecologits_models(id) on delete cascade,
  output_token_count integer not null default 1000 check (output_token_count > 0),
  electricity_mix_zone text not null default 'FRA',
  energy_min numeric,
  energy_max numeric,
  energy_unit text,
  gwp_min numeric,
  gwp_max numeric,
  gwp_unit text,
  adpe_min numeric,
  adpe_max numeric,
  adpe_unit text,
  pe_min numeric,
  pe_max numeric,
  pe_unit text,
  wcf_min numeric,
  wcf_max numeric,
  wcf_unit text,
  warnings jsonb not null default '[]'::jsonb,
  raw_response jsonb not null default '{}'::jsonb,
  estimated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ecologits_estimates_model_scenario_key
    unique (ecologits_model_id, output_token_count, electricity_mix_zone)
);

create table if not exists public.ecologits_model_links (
  id uuid primary key default gen_random_uuid(),
  ecologits_model_id uuid not null unique references public.ecologits_models(id) on delete cascade,
  maydai_model_id uuid not null unique references public.compl_ai_models(id) on delete cascade,
  match_method text not null check (match_method in ('exact', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ecologits_sync_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_source text not null check (trigger_source in ('admin', 'cron')),
  status text not null check (status in ('running', 'success', 'partial', 'error')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  providers_fetched integer not null default 0 check (providers_fetched >= 0),
  models_fetched integer not null default 0 check (models_fetched >= 0),
  models_upserted integer not null default 0 check (models_upserted >= 0),
  models_deactivated integer not null default 0 check (models_deactivated >= 0),
  estimates_succeeded integer not null default 0 check (estimates_succeeded >= 0),
  estimates_failed integer not null default 0 check (estimates_failed >= 0),
  exact_links_created integer not null default 0 check (exact_links_created >= 0),
  errors jsonb not null default '[]'::jsonb,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists ecologits_sync_runs_started_at_idx
  on public.ecologits_sync_runs (started_at desc);

alter table public.ecologits_models enable row level security;
alter table public.ecologits_estimates enable row level security;
alter table public.ecologits_model_links enable row level security;
alter table public.ecologits_sync_runs enable row level security;

grant select on public.ecologits_models to authenticated;
grant select on public.ecologits_estimates to authenticated;
grant select on public.ecologits_model_links to authenticated;
grant select on public.ecologits_sync_runs to authenticated;
grant select, insert, update, delete on public.ecologits_models to service_role;
grant select, insert, update, delete on public.ecologits_estimates to service_role;
grant select, insert, update, delete on public.ecologits_model_links to service_role;
grant select, insert, update, delete on public.ecologits_sync_runs to service_role;

drop policy if exists ecologits_models_select_admin on public.ecologits_models;
create policy ecologits_models_select_admin on public.ecologits_models
  for select to authenticated
  using ((select public.is_admin_or_super_admin((select auth.uid()))));

drop policy if exists ecologits_estimates_select_admin on public.ecologits_estimates;
create policy ecologits_estimates_select_admin on public.ecologits_estimates
  for select to authenticated
  using ((select public.is_admin_or_super_admin((select auth.uid()))));

drop policy if exists ecologits_model_links_select_admin on public.ecologits_model_links;
create policy ecologits_model_links_select_admin on public.ecologits_model_links
  for select to authenticated
  using ((select public.is_admin_or_super_admin((select auth.uid()))));

drop policy if exists ecologits_sync_runs_select_admin on public.ecologits_sync_runs;
create policy ecologits_sync_runs_select_admin on public.ecologits_sync_runs
  for select to authenticated
  using ((select public.is_admin_or_super_admin((select auth.uid()))));

comment on table public.ecologits_models is
  'Current EcoLogits catalog. Legacy eco_* tables are retained but no longer written by the admin sync.';
comment on table public.ecologits_estimates is
  'Current EcoLogits impact intervals for the standard comparison scenario.';

notify pgrst, 'reload schema';
commit;
