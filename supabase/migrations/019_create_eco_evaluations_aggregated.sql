begin;

-- EcoLogits (brief §4.4) — Table d’agrégation des évaluations Eco (KPI: 5 × splits: 3 × stats: 5 = 75 colonnes)
-- NOTE: la table existait déjà via la migration 018, avec un schéma différent.
-- Cette migration recrée la table avec le schéma attendu (DROP + CREATE).

drop table if exists public.eco_evaluations_aggregated;

create table public.eco_evaluations_aggregated (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.compl_ai_models(id) on delete cascade,
  region_code text not null,
  methodology_version_id uuid references public.eco_methodology_versions(id),
  mode text not null,
  constraint eco_evaluations_aggregated_mode_check check (mode in ('simulated','real')),
  constraint eco_evaluations_aggregated_unique unique (model_id, region_code, methodology_version_id, mode),

  -- energy
  energy_usage_mean numeric, energy_usage_median numeric, energy_usage_std numeric, energy_usage_min numeric, energy_usage_max numeric,
  energy_embodied_mean numeric, energy_embodied_median numeric, energy_embodied_std numeric, energy_embodied_min numeric, energy_embodied_max numeric,
  energy_total_mean numeric, energy_total_median numeric, energy_total_std numeric, energy_total_min numeric, energy_total_max numeric,

  -- gwp
  gwp_usage_mean numeric, gwp_usage_median numeric, gwp_usage_std numeric, gwp_usage_min numeric, gwp_usage_max numeric,
  gwp_embodied_mean numeric, gwp_embodied_median numeric, gwp_embodied_std numeric, gwp_embodied_min numeric, gwp_embodied_max numeric,
  gwp_total_mean numeric, gwp_total_median numeric, gwp_total_std numeric, gwp_total_min numeric, gwp_total_max numeric,

  -- adpe
  adpe_usage_mean numeric, adpe_usage_median numeric, adpe_usage_std numeric, adpe_usage_min numeric, adpe_usage_max numeric,
  adpe_embodied_mean numeric, adpe_embodied_median numeric, adpe_embodied_std numeric, adpe_embodied_min numeric, adpe_embodied_max numeric,
  adpe_total_mean numeric, adpe_total_median numeric, adpe_total_std numeric, adpe_total_min numeric, adpe_total_max numeric,

  -- pe
  pe_usage_mean numeric, pe_usage_median numeric, pe_usage_std numeric, pe_usage_min numeric, pe_usage_max numeric,
  pe_embodied_mean numeric, pe_embodied_median numeric, pe_embodied_std numeric, pe_embodied_min numeric, pe_embodied_max numeric,
  pe_total_mean numeric, pe_total_median numeric, pe_total_std numeric, pe_total_min numeric, pe_total_max numeric,

  -- wcf
  wcf_usage_mean numeric, wcf_usage_median numeric, wcf_usage_std numeric, wcf_usage_min numeric, wcf_usage_max numeric,
  wcf_embodied_mean numeric, wcf_embodied_median numeric, wcf_embodied_std numeric, wcf_embodied_min numeric, wcf_embodied_max numeric,
  wcf_total_mean numeric, wcf_total_median numeric, wcf_total_std numeric, wcf_total_min numeric, wcf_total_max numeric,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: Service-role only (Variante B)
alter table public.eco_evaluations_aggregated enable row level security;

drop policy if exists "eco_evaluations_aggregated_service_role_only" on public.eco_evaluations_aggregated;
create policy "eco_evaluations_aggregated_service_role_only"
  on public.eco_evaluations_aggregated
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

commit;

-- DOWN (rollback)
-- drop table if exists public.eco_evaluations_aggregated;

