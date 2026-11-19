alter table public.compl_ai_models
  add column if not exists lifecycle_status text;

alter table public.compl_ai_models
  drop constraint if exists compl_ai_models_lifecycle_status_check;

alter table public.compl_ai_models
  add constraint compl_ai_models_lifecycle_status_check
  check (lifecycle_status is null or lifecycle_status in ('active', 'deprecated', 'retired', 'legacy'));

comment on column public.compl_ai_models.lifecycle_status is
  'Statut admin (CSV) : active | deprecated | retired | legacy. Null = snapshot fournisseur officiel.';
