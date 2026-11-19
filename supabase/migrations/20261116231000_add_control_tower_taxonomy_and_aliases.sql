-- Tour de contrôle : taxonomie additive, alias de sources et visibilité.
-- N'efface aucune ligne et ne renomme aucune colonne existante.

alter table public.compl_ai_models
  add column role text,
  add column reference_model_id uuid,
  add column base_model_id uuid,
  add column merged_into_id uuid,
  add column deprecation_date date,
  add column retirement_date date,
  add column replacement_model_id uuid,
  add column lifecycle_source_url text,
  add column lifecycle_checked_at timestamptz,
  add column visibility_override boolean;

alter table public.compl_ai_models
  add constraint compl_ai_models_role_check
  check (
    role is null
    or role in (
      'base',
      'version',
      'non_documente',
      'stade',
      'format',
      'reglage',
      'auxiliaire',
      'alias',
      'introuvable',
      'a_classer'
    )
  );

alter table public.compl_ai_models
  add constraint compl_ai_models_reference_model_id_fkey
    foreign key (reference_model_id) references public.compl_ai_models (id) on delete no action,
  add constraint compl_ai_models_base_model_id_fkey
    foreign key (base_model_id) references public.compl_ai_models (id) on delete no action,
  add constraint compl_ai_models_merged_into_id_fkey
    foreign key (merged_into_id) references public.compl_ai_models (id) on delete no action,
  add constraint compl_ai_models_replacement_model_id_fkey
    foreign key (replacement_model_id) references public.compl_ai_models (id) on delete no action;

create index compl_ai_models_reference_model_id_idx
  on public.compl_ai_models (reference_model_id);
create index compl_ai_models_base_model_id_idx
  on public.compl_ai_models (base_model_id);
create index compl_ai_models_merged_into_id_idx
  on public.compl_ai_models (merged_into_id);
create index compl_ai_models_replacement_model_id_idx
  on public.compl_ai_models (replacement_model_id);

comment on column public.compl_ai_models.role is
  'Place de la ligne dans sa famille. NULL tant que la taxonomie n''est pas tranchée.';
comment on column public.compl_ai_models.reference_model_id is
  'Ligne qui porte la fiche affichée pour une variante.';
comment on column public.compl_ai_models.base_model_id is
  'Fiche de base d''une fiche de version.';
comment on column public.compl_ai_models.merged_into_id is
  'Ligne qui absorbe ce doublon. La ligne absorbée reste en base.';
comment on column public.compl_ai_models.visibility_override is
  'Forçage manuel : vrai affiche la ligne, faux la masque, NULL suit les règles.';

create table public.llm_model_aliases (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.compl_ai_models (id) on delete no action,
  source text not null check (
    source in ('llm_stats', 'comparia', 'ecologits', 'api', 'huggingface', 'manual')
  ),
  source_id text not null,
  raw_name text not null,
  normalized_name text not null,
  match_method text not null check (
    match_method in ('exact', 'slug', 'rule', 'manual')
  ),
  created_at timestamptz not null default now(),
  constraint llm_model_aliases_source_source_id_key unique (source, source_id)
);

create index llm_model_aliases_model_id_idx
  on public.llm_model_aliases (model_id);
create index llm_model_aliases_normalized_name_idx
  on public.llm_model_aliases (source, normalized_name);

comment on table public.llm_model_aliases is
  'Noms externes d''une fiche MaydAI. Une identité de source n''est enregistrée qu''une fois.';

alter table public.llm_model_aliases enable row level security;

grant select on public.llm_model_aliases to authenticated;
grant select, insert, update, delete on public.llm_model_aliases to service_role;

create policy llm_model_aliases_select_admin
  on public.llm_model_aliases
  for select
  to authenticated
  using ((select public.is_admin_or_super_admin((select auth.uid()))));

-- Les 952 identifiants du hub. EcoLogits y est déjà stocké par l'UUID du catalogue.
insert into public.llm_model_aliases (
  model_id,
  source,
  source_id,
  raw_name,
  normalized_name,
  match_method,
  created_at
)
select
  s.model_id,
  s.source,
  s.source_id,
  case
    when s.source = 'ecologits' then coalesce(e.name, s.source_id)
    else s.source_id
  end as raw_name,
  case
    when s.source = 'ecologits' then coalesce(
      e.normalized_name,
      public.normalize_llm_model_slug(coalesce(e.name, s.source_id)),
      s.source_id
    )
    else coalesce(public.normalize_llm_model_slug(s.source_id), s.source_id)
  end as normalized_name,
  s.match_method,
  s.created_at
from public.llm_model_source_ids s
left join public.ecologits_models e
  on s.source = 'ecologits'
 and e.id::text = s.source_id;

-- Les 19 liens EcoLogits posés après le remplissage du hub.
insert into public.llm_model_aliases (
  model_id,
  source,
  source_id,
  raw_name,
  normalized_name,
  match_method,
  created_at
)
select
  l.maydai_model_id,
  'ecologits',
  e.id::text,
  e.name,
  coalesce(e.normalized_name, public.normalize_llm_model_slug(e.name), e.name),
  l.match_method,
  l.created_at
from public.ecologits_model_links l
join public.ecologits_models e on e.id = l.ecologits_model_id
on conflict (source, source_id) do nothing;

-- Les 100 lignes Compar:IA liées sont déjà dans le hub : cet insert ne crée pas de seconde clé.
insert into public.llm_model_aliases (
  model_id,
  source,
  source_id,
  raw_name,
  normalized_name,
  match_method,
  created_at
)
select
  c.maydai_model_id,
  'comparia',
  c.source_id,
  c.source_id,
  coalesce(public.normalize_llm_model_slug(c.source_id), c.source_id),
  c.match_method,
  c.created_at
from public.comparia_models c
where c.maydai_model_id is not null
on conflict (source, source_id) do nothing;

-- Le slug n'est plus recalculé lors d'un renommage.
drop trigger if exists compl_ai_models_set_slug on public.compl_ai_models;
create trigger compl_ai_models_set_slug
  before insert
  on public.compl_ai_models
  for each row
  execute function public.set_compl_ai_models_slug();

comment on column public.compl_ai_models.slug is
  'Identifiant normalisé du modèle (minuscules, tirets). Unique. Posé à l''insertion ; un renommage ne le recalcule pas.';

create view public.compl_ai_models_visible
with (security_invoker = true) as
select m.*
from public.compl_ai_models m
left join public.model_providers p on p.id = m.model_provider_id
where m.visibility_override is true
   or (
     p.tooltip_title is not null
     and (m.role is null or m.role in ('base', 'version', 'non_documente'))
     and m.lifecycle_status is distinct from 'retired'
     and m.merged_into_id is null
     and m.visibility_override is distinct from false
   );

comment on view public.compl_ai_models_visible is
  'Lignes proposées dans MaydAI. Un forçage vrai affiche la ligne ; un forçage faux la masque.';

grant select on public.compl_ai_models_visible to authenticated, service_role;

notify pgrst, 'reload schema';
