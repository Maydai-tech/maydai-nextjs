begin;

-- ============================================================
-- Fix Supabase Advisor (PERFORMANCE) — auth_rls_initplan (~90 warnings)
-- ============================================================
-- Problème : ces policies RLS appellent auth.uid() / auth.role()
-- DIRECTEMENT, donc Postgres les ré-évalue POUR CHAQUE LIGNE
-- (perf suboptimale à l'échelle).
--
-- Fix officiel Supabase : envelopper l'appel dans (select ...) →
-- l'appel devient un InitPlan évalué UNE seule fois par requête.
--   auth.uid()  -> (select auth.uid())
--   auth.role() -> (select auth.role())
-- Doc : https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- Lint : https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
--
-- AUCUN changement de sémantique d'accès : le wrapping (select ...) est
-- strictement équivalent fonctionnellement. Les noms de policies, les
-- rôles (TO ...), les commandes (FOR ...) et les clauses USING/WITH CHECK
-- sont préservés à l'identique ; seul l'appel auth.* est enveloppé.
--
-- Le DDL ci-dessous a été généré depuis pg_policies de la base live
-- (api.maydai.io) pour recréer chaque policy à l'identique. Idempotent
-- (drop if exists + create). On remplace 90 policies 1-pour-1, aucune
-- policy n'est ajoutée ni supprimée.
--
-- Hors périmètre : les 14 warnings multiple_permissive_policies (non traités).
-- ============================================================

-- companies
drop policy if exists companies_delete_owner on public.companies;
create policy companies_delete_owner on public.companies
  for delete to authenticated
  using ((is_company_owner((select auth.uid()), id) OR is_super_admin((select auth.uid()))));

drop policy if exists companies_select_admin on public.companies;
create policy companies_select_admin on public.companies
  for select to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

drop policy if exists companies_select_member on public.companies;
create policy companies_select_member on public.companies
  for select to authenticated
  using (user_belongs_to_company((select auth.uid()), id));

drop policy if exists companies_update_admin on public.companies;
create policy companies_update_admin on public.companies
  for update to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

drop policy if exists companies_update_member on public.companies;
create policy companies_update_member on public.companies
  for update to authenticated
  using (user_belongs_to_company((select auth.uid()), id));

-- compl_ai_benchmarks
drop policy if exists compl_ai_benchmarks_delete_admin on public.compl_ai_benchmarks;
create policy compl_ai_benchmarks_delete_admin on public.compl_ai_benchmarks
  for delete to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

drop policy if exists compl_ai_benchmarks_insert_admin on public.compl_ai_benchmarks;
create policy compl_ai_benchmarks_insert_admin on public.compl_ai_benchmarks
  for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

drop policy if exists compl_ai_benchmarks_update_admin on public.compl_ai_benchmarks;
create policy compl_ai_benchmarks_update_admin on public.compl_ai_benchmarks
  for update to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

-- compl_ai_evaluations
drop policy if exists compl_ai_evaluations_delete_admin on public.compl_ai_evaluations;
create policy compl_ai_evaluations_delete_admin on public.compl_ai_evaluations
  for delete to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

drop policy if exists compl_ai_evaluations_insert_admin on public.compl_ai_evaluations;
create policy compl_ai_evaluations_insert_admin on public.compl_ai_evaluations
  for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

drop policy if exists compl_ai_evaluations_update_admin on public.compl_ai_evaluations;
create policy compl_ai_evaluations_update_admin on public.compl_ai_evaluations
  for update to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

-- compl_ai_models
drop policy if exists compl_ai_models_delete_admin on public.compl_ai_models;
create policy compl_ai_models_delete_admin on public.compl_ai_models
  for delete to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

drop policy if exists compl_ai_models_insert_admin on public.compl_ai_models;
create policy compl_ai_models_insert_admin on public.compl_ai_models
  for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

drop policy if exists compl_ai_models_update_admin on public.compl_ai_models;
create policy compl_ai_models_update_admin on public.compl_ai_models
  for update to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

-- compl_ai_principles
drop policy if exists compl_ai_principles_delete_admin on public.compl_ai_principles;
create policy compl_ai_principles_delete_admin on public.compl_ai_principles
  for delete to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

drop policy if exists compl_ai_principles_insert_admin on public.compl_ai_principles;
create policy compl_ai_principles_insert_admin on public.compl_ai_principles
  for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

drop policy if exists compl_ai_principles_update_admin on public.compl_ai_principles;
create policy compl_ai_principles_update_admin on public.compl_ai_principles
  for update to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

-- compl_ai_sync_logs
drop policy if exists compl_ai_sync_logs_select_admin on public.compl_ai_sync_logs;
create policy compl_ai_sync_logs_select_admin on public.compl_ai_sync_logs
  for select to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

-- contact_requests
drop policy if exists "Users can insert their own contact requests" on public.contact_requests;
create policy "Users can insert their own contact requests" on public.contact_requests
  for insert to public
  with check (((select auth.uid()) = user_id));

drop policy if exists "Users can view their own contact requests" on public.contact_requests;
create policy "Users can view their own contact requests" on public.contact_requests
  for select to public
  using (((select auth.uid()) = user_id));

-- contact_site
drop policy if exists contact_site_insert_authenticated on public.contact_site;
create policy contact_site_insert_authenticated on public.contact_site
  for insert to authenticated
  with check ((((select auth.uid()) = user_id) OR (user_id IS NULL)));

-- dossier_documents
drop policy if exists dossier_documents_insert on public.dossier_documents;
create policy dossier_documents_insert on public.dossier_documents
  for insert to public
  with check ((EXISTS ( SELECT 1
   FROM (dossiers d
     JOIN user_companies uc ON ((uc.company_id = d.company_id)))
  WHERE ((d.id = dossier_documents.dossier_id) AND (uc.user_id = (select auth.uid()))))));

drop policy if exists dossier_documents_select on public.dossier_documents;
create policy dossier_documents_select on public.dossier_documents
  for select to public
  using ((EXISTS ( SELECT 1
   FROM (dossiers d
     JOIN user_companies uc ON ((uc.company_id = d.company_id)))
  WHERE ((d.id = dossier_documents.dossier_id) AND (uc.user_id = (select auth.uid()))))));

drop policy if exists dossier_documents_update on public.dossier_documents;
create policy dossier_documents_update on public.dossier_documents
  for update to public
  using ((EXISTS ( SELECT 1
   FROM (dossiers d
     JOIN user_companies uc ON ((uc.company_id = d.company_id)))
  WHERE ((d.id = dossier_documents.dossier_id) AND (uc.user_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM (dossiers d
     JOIN user_companies uc ON ((uc.company_id = d.company_id)))
  WHERE ((d.id = dossier_documents.dossier_id) AND (uc.user_id = (select auth.uid()))))));

-- dossiers
drop policy if exists dossiers_insert on public.dossiers;
create policy dossiers_insert on public.dossiers
  for insert to public
  with check ((EXISTS ( SELECT 1
   FROM user_companies uc
  WHERE ((uc.company_id = dossiers.company_id) AND (uc.user_id = (select auth.uid()))))));

drop policy if exists dossiers_select on public.dossiers;
create policy dossiers_select on public.dossiers
  for select to authenticated
  using (user_belongs_to_company((select auth.uid()), company_id));

drop policy if exists dossiers_update on public.dossiers;
create policy dossiers_update on public.dossiers
  for update to authenticated
  using (user_belongs_to_company((select auth.uid()), company_id));

-- eco_evaluations
drop policy if exists eco_evaluations_service_role_only on public.eco_evaluations;
create policy eco_evaluations_service_role_only on public.eco_evaluations
  for all to public
  using (((select auth.role()) = 'service_role'::text))
  with check (((select auth.role()) = 'service_role'::text));

-- eco_evaluations_aggregated
drop policy if exists eco_evaluations_aggregated_service_role_only on public.eco_evaluations_aggregated;
create policy eco_evaluations_aggregated_service_role_only on public.eco_evaluations_aggregated
  for all to public
  using (((select auth.role()) = 'service_role'::text))
  with check (((select auth.role()) = 'service_role'::text));

-- eco_methodology_versions
drop policy if exists eco_methodology_versions_service_role_only on public.eco_methodology_versions;
create policy eco_methodology_versions_service_role_only on public.eco_methodology_versions
  for all to public
  using (((select auth.role()) = 'service_role'::text))
  with check (((select auth.role()) = 'service_role'::text));

-- evaluation_path_runs
drop policy if exists evaluation_path_runs_insert_company on public.evaluation_path_runs;
create policy evaluation_path_runs_insert_company on public.evaluation_path_runs
  for insert to public
  with check ((EXISTS ( SELECT 1
   FROM user_companies uc
  WHERE ((uc.user_id = (select auth.uid())) AND (uc.company_id = evaluation_path_runs.company_id)))));

drop policy if exists evaluation_path_runs_select_company on public.evaluation_path_runs;
create policy evaluation_path_runs_select_company on public.evaluation_path_runs
  for select to public
  using ((EXISTS ( SELECT 1
   FROM user_companies uc
  WHERE ((uc.user_id = (select auth.uid())) AND (uc.company_id = evaluation_path_runs.company_id)))));

drop policy if exists evaluation_path_runs_update_company on public.evaluation_path_runs;
create policy evaluation_path_runs_update_company on public.evaluation_path_runs
  for update to public
  using ((EXISTS ( SELECT 1
   FROM user_companies uc
  WHERE ((uc.user_id = (select auth.uid())) AND (uc.company_id = evaluation_path_runs.company_id)))));

-- leads
drop policy if exists leads_admin_delete on public.leads;
create policy leads_admin_delete on public.leads
  for delete to authenticated
  using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

drop policy if exists leads_admin_insert on public.leads;
create policy leads_admin_insert on public.leads
  for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

drop policy if exists leads_admin_select on public.leads;
create policy leads_admin_select on public.leads
  for select to authenticated
  using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

drop policy if exists leads_admin_update on public.leads;
create policy leads_admin_update on public.leads
  for update to authenticated
  using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

-- model_providers
drop policy if exists model_providers_delete_admin on public.model_providers;
create policy model_providers_delete_admin on public.model_providers
  for delete to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

drop policy if exists model_providers_insert_admin on public.model_providers;
create policy model_providers_insert_admin on public.model_providers
  for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

drop policy if exists model_providers_update_admin on public.model_providers;
create policy model_providers_update_admin on public.model_providers
  for update to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

-- plans
drop policy if exists plans_delete_admin on public.plans;
create policy plans_delete_admin on public.plans
  for delete to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

drop policy if exists plans_insert_admin on public.plans;
create policy plans_insert_admin on public.plans
  for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

drop policy if exists plans_update_admin on public.plans;
create policy plans_update_admin on public.plans
  for update to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

-- profiles
drop policy if exists profiles_delete_super_admin on public.profiles;
create policy profiles_delete_super_admin on public.profiles
  for delete to authenticated
  using (is_super_admin((select auth.uid())));

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (((select auth.uid()) = id));

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (((select auth.uid()) = id));

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (((select auth.uid()) = id))
  with check (((select auth.uid()) = id));

-- services
drop policy if exists services_delete_admin on public.services;
create policy services_delete_admin on public.services
  for delete to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

drop policy if exists services_insert_admin on public.services;
create policy services_insert_admin on public.services
  for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

drop policy if exists services_update_admin on public.services;
create policy services_update_admin on public.services
  for update to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

-- subscriptions
drop policy if exists subscriptions_select_admin on public.subscriptions;
create policy subscriptions_select_admin on public.subscriptions
  for select to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated
  using ((user_id = (select auth.uid())));

-- usecase_history
drop policy if exists "Users can insert history for accessible usecases" on public.usecase_history;
create policy "Users can insert history for accessible usecases" on public.usecase_history
  for insert to public
  with check (((((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid())) AND (usecase_id IN ( SELECT u.id
   FROM usecases u
  WHERE (u.company_id IN ( SELECT uc.company_id
           FROM user_companies uc
          WHERE (uc.user_id = (select auth.uid()))))))) OR (((select auth.uid()) IS NULL) AND (user_id IS NOT NULL) AND (usecase_id IN ( SELECT u.id
   FROM usecases u
  WHERE (u.company_id IN ( SELECT uc.company_id
           FROM user_companies uc
          WHERE (uc.user_id = usecase_history.user_id))))))));

drop policy if exists "Users can view history for accessible usecases" on public.usecase_history;
create policy "Users can view history for accessible usecases" on public.usecase_history
  for select to public
  using ((usecase_id IN ( SELECT u.id
   FROM usecases u
  WHERE (u.company_id IN ( SELECT user_companies.company_id
           FROM user_companies
          WHERE (user_companies.user_id = (select auth.uid())))))));

drop policy if exists usecase_history_delete_via_usecase on public.usecase_history;
create policy usecase_history_delete_via_usecase on public.usecase_history
  for delete to authenticated
  using (((EXISTS ( SELECT 1
   FROM (usecases u
     JOIN user_companies uc ON ((uc.company_id = u.company_id)))
  WHERE ((u.id = usecase_history.usecase_id) AND (uc.user_id = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM user_usecases uu
  WHERE ((uu.usecase_id = usecase_history.usecase_id) AND (uu.user_id = (select auth.uid()))))) OR is_admin_or_super_admin((select auth.uid()))));

-- usecase_nextsteps
drop policy if exists usecase_nextsteps_delete_via_usecase on public.usecase_nextsteps;
create policy usecase_nextsteps_delete_via_usecase on public.usecase_nextsteps
  for delete to authenticated
  using (((EXISTS ( SELECT 1
   FROM (usecases u
     JOIN user_companies uc ON ((uc.company_id = u.company_id)))
  WHERE ((u.id = usecase_nextsteps.usecase_id) AND (uc.user_id = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM user_usecases uu
  WHERE ((uu.usecase_id = usecase_nextsteps.usecase_id) AND (uu.user_id = (select auth.uid()))))) OR is_admin_or_super_admin((select auth.uid()))));

drop policy if exists usecase_nextsteps_insert_via_usecase on public.usecase_nextsteps;
create policy usecase_nextsteps_insert_via_usecase on public.usecase_nextsteps
  for insert to authenticated
  with check (((EXISTS ( SELECT 1
   FROM (usecases u
     JOIN user_companies uc ON ((uc.company_id = u.company_id)))
  WHERE ((u.id = usecase_nextsteps.usecase_id) AND (uc.user_id = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM user_usecases uu
  WHERE ((uu.usecase_id = usecase_nextsteps.usecase_id) AND (uu.user_id = (select auth.uid()))))) OR is_admin_or_super_admin((select auth.uid()))));

drop policy if exists usecase_nextsteps_select_admin on public.usecase_nextsteps;
create policy usecase_nextsteps_select_admin on public.usecase_nextsteps
  for select to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

drop policy if exists usecase_nextsteps_select_via_usecase on public.usecase_nextsteps;
create policy usecase_nextsteps_select_via_usecase on public.usecase_nextsteps
  for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM (usecases u
     JOIN user_companies uc ON ((uc.company_id = u.company_id)))
  WHERE ((u.id = usecase_nextsteps.usecase_id) AND (uc.user_id = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM user_usecases uu
  WHERE ((uu.usecase_id = usecase_nextsteps.usecase_id) AND (uu.user_id = (select auth.uid())))))));

drop policy if exists usecase_nextsteps_update_via_usecase on public.usecase_nextsteps;
create policy usecase_nextsteps_update_via_usecase on public.usecase_nextsteps
  for update to authenticated
  using (((EXISTS ( SELECT 1
   FROM (usecases u
     JOIN user_companies uc ON ((uc.company_id = u.company_id)))
  WHERE ((u.id = usecase_nextsteps.usecase_id) AND (uc.user_id = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM user_usecases uu
  WHERE ((uu.usecase_id = usecase_nextsteps.usecase_id) AND (uu.user_id = (select auth.uid()))))) OR is_admin_or_super_admin((select auth.uid()))));

-- usecase_responses
drop policy if exists usecase_responses_delete_via_usecase on public.usecase_responses;
create policy usecase_responses_delete_via_usecase on public.usecase_responses
  for delete to authenticated
  using (((EXISTS ( SELECT 1
   FROM (usecases u
     JOIN user_companies uc ON ((uc.company_id = u.company_id)))
  WHERE ((u.id = usecase_responses.usecase_id) AND (uc.user_id = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM user_usecases uu
  WHERE ((uu.usecase_id = usecase_responses.usecase_id) AND (uu.user_id = (select auth.uid())))))));

drop policy if exists usecase_responses_insert_via_usecase on public.usecase_responses;
create policy usecase_responses_insert_via_usecase on public.usecase_responses
  for insert to authenticated
  with check (((EXISTS ( SELECT 1
   FROM (usecases u
     JOIN user_companies uc ON ((uc.company_id = u.company_id)))
  WHERE ((u.id = usecase_responses.usecase_id) AND (uc.user_id = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM user_usecases uu
  WHERE ((uu.usecase_id = usecase_responses.usecase_id) AND (uu.user_id = (select auth.uid())))))));

drop policy if exists usecase_responses_select_admin on public.usecase_responses;
create policy usecase_responses_select_admin on public.usecase_responses
  for select to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

drop policy if exists usecase_responses_select_via_usecase on public.usecase_responses;
create policy usecase_responses_select_via_usecase on public.usecase_responses
  for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM (usecases u
     JOIN user_companies uc ON ((uc.company_id = u.company_id)))
  WHERE ((u.id = usecase_responses.usecase_id) AND (uc.user_id = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM user_usecases uu
  WHERE ((uu.usecase_id = usecase_responses.usecase_id) AND (uu.user_id = (select auth.uid())))))));

drop policy if exists usecase_responses_update_via_usecase on public.usecase_responses;
create policy usecase_responses_update_via_usecase on public.usecase_responses
  for update to authenticated
  using (((EXISTS ( SELECT 1
   FROM (usecases u
     JOIN user_companies uc ON ((uc.company_id = u.company_id)))
  WHERE ((u.id = usecase_responses.usecase_id) AND (uc.user_id = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM user_usecases uu
  WHERE ((uu.usecase_id = usecase_responses.usecase_id) AND (uu.user_id = (select auth.uid())))))));

-- usecases
drop policy if exists usecases_delete_company_member on public.usecases;
create policy usecases_delete_company_member on public.usecases
  for delete to authenticated
  using (user_belongs_to_company((select auth.uid()), company_id));

drop policy if exists usecases_insert_company_member on public.usecases;
create policy usecases_insert_company_member on public.usecases
  for insert to authenticated
  with check (user_belongs_to_company((select auth.uid()), company_id));

drop policy if exists usecases_select_admin on public.usecases;
create policy usecases_select_admin on public.usecases
  for select to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

drop policy if exists usecases_select_company on public.usecases;
create policy usecases_select_company on public.usecases
  for select to authenticated
  using (user_belongs_to_company((select auth.uid()), company_id));

drop policy if exists usecases_select_direct_access on public.usecases;
create policy usecases_select_direct_access on public.usecases
  for select to authenticated
  using (user_has_usecase_access((select auth.uid()), id));

drop policy if exists usecases_update_company_member on public.usecases;
create policy usecases_update_company_member on public.usecases
  for update to authenticated
  using (user_belongs_to_company((select auth.uid()), company_id));

drop policy if exists usecases_update_direct_access on public.usecases;
create policy usecases_update_direct_access on public.usecases
  for update to authenticated
  using (user_has_usecase_access((select auth.uid()), id));

-- user_companies
drop policy if exists user_companies_delete_owner on public.user_companies;
create policy user_companies_delete_owner on public.user_companies
  for delete to authenticated
  using (is_company_owner((select auth.uid()), company_id));

drop policy if exists user_companies_delete_self on public.user_companies;
create policy user_companies_delete_self on public.user_companies
  for delete to authenticated
  using (((user_id = (select auth.uid())) AND (role <> 'owner'::text)));

drop policy if exists user_companies_insert_first_owner on public.user_companies;
create policy user_companies_insert_first_owner on public.user_companies
  for insert to authenticated
  with check (((user_id = (select auth.uid())) AND (role = 'owner'::text) AND (NOT (EXISTS ( SELECT 1
   FROM user_companies uc
  WHERE ((uc.company_id = user_companies.company_id) AND (uc.role = 'owner'::text)))))));

drop policy if exists user_companies_insert_owner on public.user_companies;
create policy user_companies_insert_owner on public.user_companies
  for insert to authenticated
  with check (is_company_owner((select auth.uid()), company_id));

drop policy if exists user_companies_select_admin on public.user_companies;
create policy user_companies_select_admin on public.user_companies
  for select to authenticated
  using (is_admin_or_super_admin((select auth.uid())));

drop policy if exists user_companies_select_own on public.user_companies;
create policy user_companies_select_own on public.user_companies
  for select to authenticated
  using ((user_id = (select auth.uid())));

drop policy if exists user_companies_select_owner on public.user_companies;
create policy user_companies_select_owner on public.user_companies
  for select to public
  using (user_is_owner_of_company((select auth.uid()), company_id));

drop policy if exists user_companies_update_owner on public.user_companies;
create policy user_companies_update_owner on public.user_companies
  for update to authenticated
  using (is_company_owner((select auth.uid()), company_id));

-- user_profiles
drop policy if exists user_profiles_delete_involved on public.user_profiles;
create policy user_profiles_delete_involved on public.user_profiles
  for delete to authenticated
  using (((inviter_user_id = (select auth.uid())) OR (invited_user_id = (select auth.uid()))));

drop policy if exists user_profiles_insert_inviter on public.user_profiles;
create policy user_profiles_insert_inviter on public.user_profiles
  for insert to authenticated
  with check ((inviter_user_id = (select auth.uid())));

drop policy if exists user_profiles_select_involved on public.user_profiles;
create policy user_profiles_select_involved on public.user_profiles
  for select to authenticated
  using (((inviter_user_id = (select auth.uid())) OR (invited_user_id = (select auth.uid()))));

drop policy if exists user_profiles_update_inviter on public.user_profiles;
create policy user_profiles_update_inviter on public.user_profiles
  for update to authenticated
  using ((inviter_user_id = (select auth.uid())));

-- user_usecases
drop policy if exists user_usecases_delete_company_member on public.user_usecases;
create policy user_usecases_delete_company_member on public.user_usecases
  for delete to authenticated
  using (user_has_company_usecase_access((select auth.uid()), usecase_id));

drop policy if exists user_usecases_insert_company_member on public.user_usecases;
create policy user_usecases_insert_company_member on public.user_usecases
  for insert to authenticated
  with check (user_has_company_usecase_access((select auth.uid()), usecase_id));

drop policy if exists user_usecases_select_company_member on public.user_usecases;
create policy user_usecases_select_company_member on public.user_usecases
  for select to authenticated
  using (user_has_company_usecase_access((select auth.uid()), usecase_id));

drop policy if exists user_usecases_select_own on public.user_usecases;
create policy user_usecases_select_own on public.user_usecases
  for select to authenticated
  using ((user_id = (select auth.uid())));

commit;

-- ============================================================
-- DOWN (rollback)
-- ============================================================
-- Le rollback consiste à recréer les mêmes policies SANS le wrapping
-- (select ...). Non destructif : aucune donnée touchée, uniquement la
-- définition des policies. En pratique, le plus simple est de re-générer
-- depuis pg_policies. Les warnings auth_rls_initplan réapparaîtraient.
