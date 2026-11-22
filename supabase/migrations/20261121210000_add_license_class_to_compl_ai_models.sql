-- Classe de licence des poids, distincte de model_type et de license (llm-stats).

alter table public.compl_ai_models
  add column if not exists license_class text not null default 'unknown',
  add column if not exists license_id text,
  add column if not exists license_url text,
  add column if not exists license_eu_restricted boolean not null default false;

alter table public.compl_ai_models
  drop constraint if exists compl_ai_models_license_class_check;

alter table public.compl_ai_models
  add constraint compl_ai_models_license_class_check
  check (license_class in (
    'proprietary',
    'open_free',
    'open_conditional',
    'open_non_commercial',
    'open_to_qualify',
    'unknown'
  ));

comment on column public.compl_ai_models.license_class is
  'Classe de la licence des poids, arbitrée par le Pôle Doctrine et Juridique. unknown par défaut.';
comment on column public.compl_ai_models.license_id is
  'Identifiant court de la licence, par exemple apache-2.0. Vide si l’éditeur n’en publie pas.';
comment on column public.compl_ai_models.license_url is
  'URL du texte de licence dans le dépôt officiel de l’éditeur.';
comment on column public.compl_ai_models.license_eu_restricted is
  'Vrai quand la licence exclut les personnes et entreprises établies dans l’Union européenne.';

drop view if exists public.compl_ai_models_visible;

create view public.compl_ai_models_visible
with (security_invoker = true) as
select m.*
from public.compl_ai_models m
left join public.model_providers p on p.id = m.model_provider_id
where m.visibility_override is true
   or (
     p.tooltip_title is not null
     and (m.role is null or m.role in ('base', 'version', 'non_documente'))
     and m.merged_into_id is null
     and m.visibility_override is distinct from false
     and (
       m.lifecycle_status is distinct from 'retired'
       or m.license_class in (
         'open_free',
         'open_conditional',
         'open_non_commercial',
         'open_to_qualify'
       )
     )
   );

comment on view public.compl_ai_models_visible is
  'Lignes proposées dans MaydAI. Un forçage vrai affiche la ligne ; un forçage faux la masque. Un modèle retiré reste visible si ses poids sont publiés.';

grant select on public.compl_ai_models_visible to authenticated, service_role;

notify pgrst, 'reload schema';
