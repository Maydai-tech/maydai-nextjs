-- Annule 20261126003000_fix_llm_sync_and_ecologits_links.sql
-- Restaure les 23 liens supprimés, le nom à double espace et le statut déprécié.

insert into public.ecologits_model_links (ecologits_model_id, maydai_model_id, match_method)
select em.id, m.id, 'manual'
from (
  values
    ('gemini-1-5-flash', 'gemini-3.1-flash-image-preview'),
    ('gemini-1-5-flash', 'gemini-flash-latest'),
    ('gemini-1-5-flash', 'gemini-flash-lite-latest'),
    ('gemini-2-5-flash', 'gemini-2.5-flash-image'),
    ('gemini-3-pro', 'gemini-3-pro-image-preview'),
    ('mistral-large-3', 'mistralai/Mistral-Large-Instruct-2407'),
    ('mistral-large-3', 'mistral-large-latest'),
    ('mistral-medium-3-5', 'mistral-medium'),
    ('mistral-medium-3-5', 'mistral-medium-2505'),
    ('mistral-medium-3-5', 'mistral-medium-2508'),
    ('mistral-medium-3-5', 'mistral-medium-2604'),
    ('mistral-medium-3-5', 'mistral-medium-3'),
    ('mistral-medium-3-5', 'mistral-medium-3.5'),
    ('mistral-medium-3-5', 'mistral-medium-latest'),
    ('llama-3-1-8b-instruct', 'meta-llama/Meta-Llama-3.1-8B'),
    ('llama-3-1-8b-instruct', 'meta-llama/Meta-Llama-3-8B'),
    ('llama-3-1-8b-instruct', 'meta-llama/Meta-Llama-3-8B-Instruct'),
    ('llama-3-1-70b-instruct', 'meta-llama/Meta-Llama-3.1-70B'),
    ('llama-3-1-70b-instruct', 'meta-llama/Meta-Llama-3-70B'),
    ('llama-3-1-70b-instruct', 'meta-llama/Meta-Llama-3-70B-Instruct'),
    ('llama-3-1-405b-instruct', 'meta-llama/Meta-Llama-3.1-405B'),
    ('llama-3-1-405b-instruct', 'meta-llama/Meta-Llama-3.1-405B-FP8'),
    ('llama-3-1-405b-instruct', 'meta-llama/Meta-Llama-3.1-405B-Instruct-FP8')
) as removed(slug, eco_name)
join public.compl_ai_models m on m.slug = removed.slug
join public.ecologits_models em on em.name = removed.eco_name
on conflict (ecologits_model_id) do nothing;

update public.compl_ai_models
set lifecycle_status = 'deprecated',
    updated_at = now()
where id = 'f14dac64-4992-4c1a-8602-e9880e4b2392';

update public.compl_ai_models
set model_name = 'Min  istral 3 (3B Reasoning 2512)',
    updated_at = now()
where id = '1d0caf32-5eb6-4a11-9258-08acb650dfde';

alter table public.ecologits_models
  drop constraint if exists ecologits_models_link_status_check;

alter table public.ecologits_models
  drop column if exists link_status;
