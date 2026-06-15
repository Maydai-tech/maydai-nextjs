begin;

-- ============================================================
-- Fix Supabase Advisor — function_search_path_mutable (3 WARN SECURITY)
-- ============================================================
-- Fige le search_path des 3 fonctions pour éviter le search-path hijacking.
--   - public.role() / public.uid() : n'appellent que auth.* (déjà qualifié)
--     → ALTER ... SET search_path = '' (corps inchangé).
--   - public.user_is_owner_of_company : SECURITY DEFINER + référence
--     user_companies non qualifiée → recréée avec public.user_companies
--     et SET search_path = '' (le plus sûr pour une fonction DEFINER).
-- ============================================================

alter function public.role() set search_path = '';
alter function public.uid()  set search_path = '';

create or replace function public.user_is_owner_of_company(user_uuid uuid, company_uuid uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $function$
  select exists (
    select 1 from public.user_companies
    where user_id = user_uuid
      and company_id = company_uuid
      and role = 'owner'
  );
$function$;

commit;

-- ============================================================
-- DOWN (rollback manuel si besoin)
-- ============================================================
-- alter function public.role() reset search_path;
-- alter function public.uid()  reset search_path;
-- -- (user_is_owner_of_company : recréer sans `set search_path` et avec
-- --  `user_companies` non qualifié pour revenir à l'état initial)
