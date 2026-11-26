-- Corrige le statut de lien EcoLogits, un nom de fiche, un retrait dépassé,
-- et 23 liens EcoLogits erronés. Ne modifie pas usecases, usecase_history
-- ni compl_ai_evaluations.

alter table public.ecologits_models
  add column if not exists link_status text;

update public.ecologits_models
set link_status = 'unmatched'
where link_status is null;

alter table public.ecologits_models
  alter column link_status set default 'unmatched';

alter table public.ecologits_models
  alter column link_status set not null;

do $$
begin
  alter table public.ecologits_models
    add constraint ecologits_models_link_status_check
    check (link_status in ('unmatched', 'matched', 'ignored'));
exception
  when duplicate_object then null;
end $$;

update public.compl_ai_models
set model_name = 'Ministral 3 (3B Reasoning 2512)',
    updated_at = now()
where id = '1d0caf32-5eb6-4a11-9258-08acb650dfde';

update public.compl_ai_models
set lifecycle_status = 'retired',
    updated_at = now()
where id = 'f14dac64-4992-4c1a-8602-e9880e4b2392'
  and retirement_date <= date '2026-11-25';

delete from public.ecologits_model_links eml
using public.compl_ai_models m, public.ecologits_models em
where eml.maydai_model_id = m.id
  and eml.ecologits_model_id = em.id
  and (
    (m.slug = 'gemini-1-5-flash' and em.name in (
      'gemini-3.1-flash-image-preview',
      'gemini-flash-latest',
      'gemini-flash-lite-latest'
    ))
    or (m.slug = 'gemini-2-5-flash' and em.name = 'gemini-2.5-flash-image')
    or (m.slug = 'gemini-3-pro' and em.name = 'gemini-3-pro-image-preview')
    or (m.slug = 'mistral-large-3' and em.name in (
      'mistralai/Mistral-Large-Instruct-2407',
      'mistral-large-latest'
    ))
    or (m.slug = 'mistral-medium-3-5' and em.name <> 'mistral-medium-3-5')
    or (m.slug = 'llama-3-1-8b-instruct' and em.name <> 'meta-llama/Meta-Llama-3.1-8B-Instruct')
    or (m.slug = 'llama-3-1-70b-instruct' and em.name <> 'meta-llama/Meta-Llama-3.1-70B-Instruct')
    or (m.slug = 'llama-3-1-405b-instruct' and em.name <> 'meta-llama/Meta-Llama-3.1-405B-Instruct')
  );

update public.ecologits_models em
set link_status = case
      when exists (
        select 1
        from public.ecologits_model_links eml
        where eml.ecologits_model_id = em.id
      ) then 'matched'
      else 'unmatched'
    end,
    updated_at = now()
where em.link_status is distinct from 'ignored';
