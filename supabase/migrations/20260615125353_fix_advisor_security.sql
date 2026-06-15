begin;

-- ============================================================
-- Fix Supabase Advisor (9 erreurs ERROR de sécurité)
-- ============================================================
-- Partie 1 : rls_disabled_in_public — activer la RLS sur 2 tables eco.
-- Partie 2 : security_definer_view — passer 7 vues en security_invoker.
--
-- Audit d'absence de régression : voir le plan
-- (.claude/plans/...fix_advisor_security). En résumé :
--   - Les 2 tables eco ne sont accédées QUE via service_role
--     (eco-sync route + edge functions) → service_role bypasse la RLS.
--   - Seule la vue compl_ai_maydai_scores est lue par l'app, toujours en
--     rôle `authenticated` (qui a SELECT USING(true) sur les tables sous-jacentes).
-- ============================================================

-- ------------------------------------------------------------
-- Partie 1 : RLS sur eco_methodology_versions & eco_evaluations
-- Pattern identique à eco_evaluations_aggregated (migration 019) : service_role only.
-- ------------------------------------------------------------
alter table public.eco_methodology_versions enable row level security;
drop policy if exists "eco_methodology_versions_service_role_only" on public.eco_methodology_versions;
create policy "eco_methodology_versions_service_role_only"
  on public.eco_methodology_versions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

alter table public.eco_evaluations enable row level security;
drop policy if exists "eco_evaluations_service_role_only" on public.eco_evaluations;
create policy "eco_evaluations_service_role_only"
  on public.eco_evaluations
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ------------------------------------------------------------
-- Partie 2 : security_invoker = on sur les 7 vues (PostgreSQL 15+)
-- Les vues s'exécutent désormais avec les droits/RLS du rôle appelant.
-- ------------------------------------------------------------
alter view public.compl_ai_global_leaderboard        set (security_invoker = on);
alter view public.compl_ai_maydai_global_leaderboard set (security_invoker = on);
alter view public.compl_ai_model_scores              set (security_invoker = on);
alter view public.compl_ai_maydai_scores             set (security_invoker = on);
alter view public.company_stats                      set (security_invoker = on);
alter view public.usecases_with_model                set (security_invoker = on);
alter view public.eco_evaluations_readable           set (security_invoker = on);

commit;

-- ============================================================
-- DOWN (rollback manuel si besoin)
-- ============================================================
-- alter view public.compl_ai_global_leaderboard        set (security_invoker = off);
-- alter view public.compl_ai_maydai_global_leaderboard set (security_invoker = off);
-- alter view public.compl_ai_model_scores              set (security_invoker = off);
-- alter view public.compl_ai_maydai_scores             set (security_invoker = off);
-- alter view public.company_stats                      set (security_invoker = off);
-- alter view public.usecases_with_model                set (security_invoker = off);
-- alter view public.eco_evaluations_readable           set (security_invoker = off);
-- alter table public.eco_evaluations disable row level security;
-- alter table public.eco_methodology_versions disable row level security;
