begin;

-- Migration 1 : Modification compl_ai_models
alter table public.compl_ai_models
  add column if not exists eco_provider text,
  add column if not exists eco_model text,
  add column if not exists eco_status text,
  add column if not exists eco_resolved_at timestamptz;

alter table public.compl_ai_models
  drop constraint if exists compl_ai_models_model_name_key;

alter table public.compl_ai_models
  add constraint compl_ai_models_provider_name_key
  unique (model_provider_id, model_name);

create index if not exists idx_compl_ai_models_eco_covered
  on public.compl_ai_models (eco_provider, eco_model)
  where eco_status in ('covered', 'covered_via_alias', 'covered_via_dated');

-- Migration 2 : eco_methodology_versions
create table if not exists public.eco_methodology_versions (
  id uuid primary key default gen_random_uuid(),
  ecologits_version text not null,
  methodology_date date null,
  source_url text null,
  electricity_factor_source text null,
  pue_default jsonb null,
  units jsonb not null default '{"energy":"kWh","gwp":"kgCO2eq","adpe":"kgSbeq","pe":"MJ","wcf":"L"}'::jsonb,
  notes text null,
  captured_at timestamptz not null default now(),
  constraint eco_methodology_versions_unique unique (ecologits_version, methodology_date)
);

-- Migration 3 : eco_evaluations
create table if not exists public.eco_evaluations (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.compl_ai_models(id) on delete cascade,
  region_code text not null,
  run_index int not null,
  methodology_version_id uuid not null references public.eco_methodology_versions(id),
  input_tokens int not null,
  output_tokens int not null,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  latency_s numeric null,
  warnings text[] not null default array[]::text[],
  mode text not null,
  constraint eco_evaluations_mode_check check (mode in ('simulated','real')),
  energy_usage_min numeric, energy_usage_value numeric, energy_usage_max numeric,
  energy_embodied_min numeric, energy_embodied_value numeric, energy_embodied_max numeric,
  energy_total_min numeric, energy_total_value numeric, energy_total_max numeric,
  gwp_usage_min numeric, gwp_usage_value numeric, gwp_usage_max numeric,
  gwp_embodied_min numeric, gwp_embodied_value numeric, gwp_embodied_max numeric,
  gwp_total_min numeric, gwp_total_value numeric, gwp_total_max numeric,
  adpe_usage_min numeric, adpe_usage_value numeric, adpe_usage_max numeric,
  adpe_embodied_min numeric, adpe_embodied_value numeric, adpe_embodied_max numeric,
  adpe_total_min numeric, adpe_total_value numeric, adpe_total_max numeric,
  pe_usage_min numeric, pe_usage_value numeric, pe_usage_max numeric,
  pe_embodied_min numeric, pe_embodied_value numeric, pe_embodied_max numeric,
  pe_total_min numeric, pe_total_value numeric, pe_total_max numeric,
  wcf_usage_min numeric, wcf_usage_value numeric, wcf_usage_max numeric,
  wcf_embodied_min numeric, wcf_embodied_value numeric, wcf_embodied_max numeric,
  wcf_total_min numeric, wcf_total_value numeric, wcf_total_max numeric,
  created_at timestamptz not null default now(),
  ingested_at timestamptz not null default now(),
  constraint eco_evaluations_run_index_check check (run_index between 1 and 5),
  constraint eco_evaluations_tokens_check check (input_tokens >= 0 and output_tokens >= 0),
  constraint eco_evaluations_unique_run unique (model_id, region_code, methodology_version_id, run_index, mode)
);
create index if not exists idx_eco_evaluations_model_region on public.eco_evaluations (model_id, region_code);
create index if not exists idx_eco_evaluations_methodology on public.eco_evaluations (methodology_version_id);
create index if not exists idx_eco_evaluations_created_at on public.eco_evaluations (created_at);

-- Migration 4 : eco_evaluations_aggregated
create table if not exists public.eco_evaluations_aggregated (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.compl_ai_models(id) on delete cascade,
  region_code text not null,
  methodology_version_id uuid not null references public.eco_methodology_versions(id),
  mode text not null,
  constraint eco_evaluations_aggregated_mode_check check (mode in ('simulated','real')),
  runs_count int not null,
  runs_with_warnings int not null default 0,
  constraint eco_evaluations_aggregated_runs_count_check check (runs_count > 0),
  energy_usage_mean numeric, energy_usage_median numeric, energy_usage_std numeric,
  energy_usage_min_observed numeric, energy_usage_max_observed numeric,
  energy_embodied_mean numeric, energy_embodied_median numeric, energy_embodied_std numeric,
  energy_embodied_min_observed numeric, energy_embodied_max_observed numeric,
  energy_total_mean numeric, energy_total_median numeric, energy_total_std numeric,
  energy_total_min_observed numeric, energy_total_max_observed numeric,
  gwp_usage_mean numeric, gwp_usage_median numeric, gwp_usage_std numeric,
  gwp_usage_min_observed numeric, gwp_usage_max_observed numeric,
  gwp_embodied_mean numeric, gwp_embodied_median numeric, gwp_embodied_std numeric,
  gwp_embodied_min_observed numeric, gwp_embodied_max_observed numeric,
  gwp_total_mean numeric, gwp_total_median numeric, gwp_total_std numeric,
  gwp_total_min_observed numeric, gwp_total_max_observed numeric,
  adpe_usage_mean numeric, adpe_usage_median numeric, adpe_usage_std numeric,
  adpe_usage_min_observed numeric, adpe_usage_max_observed numeric,
  adpe_embodied_mean numeric, adpe_embodied_median numeric, adpe_embodied_std numeric,
  adpe_embodied_min_observed numeric, adpe_embodied_max_observed numeric,
  adpe_total_mean numeric, adpe_total_median numeric, adpe_total_std numeric,
  adpe_total_min_observed numeric, adpe_total_max_observed numeric,
  pe_usage_mean numeric, pe_usage_median numeric, pe_usage_std numeric,
  pe_usage_min_observed numeric, pe_usage_max_observed numeric,
  pe_embodied_mean numeric, pe_embodied_median numeric, pe_embodied_std numeric,
  pe_embodied_min_observed numeric, pe_embodied_max_observed numeric,
  pe_total_mean numeric, pe_total_median numeric, pe_total_std numeric,
  pe_total_min_observed numeric, pe_total_max_observed numeric,
  wcf_usage_mean numeric, wcf_usage_median numeric, wcf_usage_std numeric,
  wcf_usage_min_observed numeric, wcf_usage_max_observed numeric,
  wcf_embodied_mean numeric, wcf_embodied_median numeric, wcf_embodied_std numeric,
  wcf_embodied_min_observed numeric, wcf_embodied_max_observed numeric,
  wcf_total_mean numeric, wcf_total_median numeric, wcf_total_std numeric,
  wcf_total_min_observed numeric, wcf_total_max_observed numeric,
  created_at timestamptz not null default now(),
  refreshed_at timestamptz not null default now(),
  constraint eco_evaluations_aggregated_unique unique (model_id, region_code, methodology_version_id, mode)
);
create index if not exists idx_eco_evaluations_aggregated_model_region on public.eco_evaluations_aggregated (model_id, region_code);
create index if not exists idx_eco_evaluations_aggregated_methodology on public.eco_evaluations_aggregated (methodology_version_id);

commit;
