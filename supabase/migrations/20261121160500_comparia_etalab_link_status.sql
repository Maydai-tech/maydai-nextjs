-- Compar:IA Etalab 2.0 : classe de classement, statut de rapprochement persistant,
-- historique d'import enrichi. Idempotent.

begin;

alter table public.comparia_models
  add column if not exists ranking_class integer;

alter table public.comparia_models
  add column if not exists link_status text;

update public.comparia_models
set link_status = case
  when maydai_model_id is not null then 'matched'
  else 'unmatched'
end
where link_status is null
   or link_status not in ('matched', 'unmatched', 'ignored');

alter table public.comparia_models
  alter column link_status set default 'unmatched';

alter table public.comparia_models
  alter column link_status set not null;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'comparia_models'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%match_method%'
  loop
    execute format('alter table public.comparia_models drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.comparia_models
  drop constraint if exists comparia_models_link_consistency;

alter table public.comparia_models
  drop constraint if exists comparia_models_link_status_check;

alter table public.comparia_models
  drop constraint if exists comparia_models_match_method_check;

alter table public.comparia_models
  drop constraint if exists comparia_models_ranking_class_check;

alter table public.comparia_models
  add constraint comparia_models_link_status_check
  check (link_status in ('matched', 'unmatched', 'ignored'));

alter table public.comparia_models
  add constraint comparia_models_match_method_check
  check (match_method is null or match_method in ('exact', 'slug', 'manual'));

alter table public.comparia_models
  add constraint comparia_models_link_consistency check (
    (link_status = 'matched' and maydai_model_id is not null and match_method is not null)
    or (link_status in ('unmatched', 'ignored') and maydai_model_id is null and match_method is null)
  );

alter table public.comparia_models
  add constraint comparia_models_ranking_class_check
  check (ranking_class is null or ranking_class > 0);

create or replace function public.comparia_clear_deleted_model_link()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.maydai_model_id is null and old.maydai_model_id is not null then
    new.match_method := null;
    if new.link_status = 'matched' then
      new.link_status := 'unmatched';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists comparia_models_clear_deleted_model_link on public.comparia_models;
create trigger comparia_models_clear_deleted_model_link
  before update on public.comparia_models
  for each row
  execute function public.comparia_clear_deleted_model_link();

create index if not exists comparia_models_link_status_idx
  on public.comparia_models (link_status, is_active, rank);

alter table public.comparia_import_runs
  add column if not exists ranking_date date;

alter table public.comparia_import_runs
  add column if not exists matched_count integer not null default 0;

alter table public.comparia_import_runs
  add column if not exists ignored_count integer not null default 0;

alter table public.comparia_import_runs
  add column if not exists unmatched_count integer not null default 0;

alter table public.comparia_import_runs
  drop constraint if exists comparia_import_runs_match_counts_check;

alter table public.comparia_import_runs
  add constraint comparia_import_runs_match_counts_check
  check (matched_count >= 0 and ignored_count >= 0 and unmatched_count >= 0);

comment on column public.comparia_models.ranking_class is
  'Colonne Class du CSV Etalab Compar:IA.';

comment on column public.comparia_models.link_status is
  'matched = lié à une fiche MaydAI, unmatched = décision admin en attente, ignored = exclu des alertes.';

comment on column public.comparia_models.consumption_mwh_per_1k_tokens is
  'Consommation brute Compar:IA en mWh pour 1 000 tokens. La fiche MaydAI (consumption_wh_per_1k_tokens) est en Wh : valeur / 1000.';

notify pgrst, 'reload schema';

commit;
