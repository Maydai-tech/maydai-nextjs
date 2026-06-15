-- Script de synchronisation des RLS de la prod vers OVH
-- Généré automatiquement

-- =====================================================
-- PARTIE 1: FONCTIONS HELPER
-- =====================================================

-- Fonction: is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role = 'super_admin'
  );
$function$;

-- Fonction: is_admin_or_super_admin
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role IN ('admin', 'super_admin')
  );
$function$;

-- Fonction: is_company_owner
CREATE OR REPLACE FUNCTION public.is_company_owner(user_uuid uuid, company_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_id = user_uuid
    AND company_id = company_uuid
    AND role = 'owner'
  );
$function$;

-- Fonction: user_belongs_to_company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(user_uuid uuid, company_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_id = user_uuid
    AND company_id = company_uuid
  );
$function$;

-- Fonction: user_has_usecase_access
CREATE OR REPLACE FUNCTION public.user_has_usecase_access(user_uuid uuid, usecase_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM user_usecases
    WHERE user_id = user_uuid
    AND usecase_id = usecase_uuid
  );
$function$;

-- Fonction: user_has_company_usecase_access
CREATE OR REPLACE FUNCTION public.user_has_company_usecase_access(user_uuid uuid, usecase_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM usecases u
    JOIN user_companies uc ON uc.company_id = u.company_id
    WHERE u.id = usecase_uuid
    AND uc.user_id = user_uuid
  );
$function$;

-- =====================================================
-- PARTIE 2: SUPPRESSION DES ANCIENNES POLICIES
-- =====================================================

-- companies
DROP POLICY IF EXISTS "Allow all for service role" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies they belong to" ON public.companies;
DROP POLICY IF EXISTS "companies_delete_owner" ON public.companies;
DROP POLICY IF EXISTS "companies_insert_authenticated" ON public.companies;
DROP POLICY IF EXISTS "companies_select_admin" ON public.companies;
DROP POLICY IF EXISTS "companies_select_member" ON public.companies;
DROP POLICY IF EXISTS "companies_update_admin" ON public.companies;
DROP POLICY IF EXISTS "companies_update_member" ON public.companies;

-- compl_ai_benchmarks
DROP POLICY IF EXISTS "Anyone can view compl_ai_benchmarks" ON public.compl_ai_benchmarks;
DROP POLICY IF EXISTS "compl_ai_benchmarks_delete_admin" ON public.compl_ai_benchmarks;
DROP POLICY IF EXISTS "compl_ai_benchmarks_insert_admin" ON public.compl_ai_benchmarks;
DROP POLICY IF EXISTS "compl_ai_benchmarks_select_authenticated" ON public.compl_ai_benchmarks;
DROP POLICY IF EXISTS "compl_ai_benchmarks_update_admin" ON public.compl_ai_benchmarks;

-- compl_ai_evaluations
DROP POLICY IF EXISTS "Anyone can view compl_ai_evaluations" ON public.compl_ai_evaluations;
DROP POLICY IF EXISTS "compl_ai_evaluations_delete_admin" ON public.compl_ai_evaluations;
DROP POLICY IF EXISTS "compl_ai_evaluations_insert_admin" ON public.compl_ai_evaluations;
DROP POLICY IF EXISTS "compl_ai_evaluations_select_authenticated" ON public.compl_ai_evaluations;
DROP POLICY IF EXISTS "compl_ai_evaluations_update_admin" ON public.compl_ai_evaluations;

-- compl_ai_models
DROP POLICY IF EXISTS "Anyone can view compl_ai_models" ON public.compl_ai_models;
DROP POLICY IF EXISTS "compl_ai_models_delete_admin" ON public.compl_ai_models;
DROP POLICY IF EXISTS "compl_ai_models_insert_admin" ON public.compl_ai_models;
DROP POLICY IF EXISTS "compl_ai_models_select_authenticated" ON public.compl_ai_models;
DROP POLICY IF EXISTS "compl_ai_models_update_admin" ON public.compl_ai_models;

-- compl_ai_principles
DROP POLICY IF EXISTS "Anyone can view compl_ai_principles" ON public.compl_ai_principles;
DROP POLICY IF EXISTS "compl_ai_principles_delete_admin" ON public.compl_ai_principles;
DROP POLICY IF EXISTS "compl_ai_principles_insert_admin" ON public.compl_ai_principles;
DROP POLICY IF EXISTS "compl_ai_principles_select_authenticated" ON public.compl_ai_principles;
DROP POLICY IF EXISTS "compl_ai_principles_update_admin" ON public.compl_ai_principles;

-- compl_ai_sync_logs
DROP POLICY IF EXISTS "compl_ai_sync_logs_select_admin" ON public.compl_ai_sync_logs;

-- contact_requests
DROP POLICY IF EXISTS "Allow all for service role" ON public.contact_requests;
DROP POLICY IF EXISTS "contact_requests_delete_via_usecase" ON public.contact_requests;
DROP POLICY IF EXISTS "Users can insert their own contact requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Users can view their own contact requests" ON public.contact_requests;

-- dossier_documents
DROP POLICY IF EXISTS "Users can view dossier_documents" ON public.dossier_documents;
DROP POLICY IF EXISTS "dossier_documents_insert" ON public.dossier_documents;
DROP POLICY IF EXISTS "dossier_documents_select" ON public.dossier_documents;
DROP POLICY IF EXISTS "dossier_documents_update" ON public.dossier_documents;

-- dossiers
DROP POLICY IF EXISTS "Users can insert dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Users can view dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "dossiers_delete_via_usecase" ON public.dossiers;
DROP POLICY IF EXISTS "dossiers_insert" ON public.dossiers;
DROP POLICY IF EXISTS "dossiers_select" ON public.dossiers;
DROP POLICY IF EXISTS "dossiers_update" ON public.dossiers;

-- model_providers
DROP POLICY IF EXISTS "Anyone can view model_providers" ON public.model_providers;
DROP POLICY IF EXISTS "model_providers_delete_admin" ON public.model_providers;
DROP POLICY IF EXISTS "model_providers_insert_admin" ON public.model_providers;
DROP POLICY IF EXISTS "model_providers_select_authenticated" ON public.model_providers;
DROP POLICY IF EXISTS "model_providers_update_admin" ON public.model_providers;

-- plans
DROP POLICY IF EXISTS "Allow all for service role" ON public.plans;
DROP POLICY IF EXISTS "Anyone can view plans" ON public.plans;
DROP POLICY IF EXISTS "plans_delete_admin" ON public.plans;
DROP POLICY IF EXISTS "plans_insert_admin" ON public.plans;
DROP POLICY IF EXISTS "plans_select_authenticated" ON public.plans;
DROP POLICY IF EXISTS "plans_select_public" ON public.plans;
DROP POLICY IF EXISTS "plans_update_admin" ON public.plans;

-- profiles
DROP POLICY IF EXISTS "Allow all for service role" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_super_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- services
DROP POLICY IF EXISTS "Anyone can view services" ON public.services;
DROP POLICY IF EXISTS "services_delete_admin" ON public.services;
DROP POLICY IF EXISTS "services_insert_admin" ON public.services;
DROP POLICY IF EXISTS "services_select_authenticated" ON public.services;
DROP POLICY IF EXISTS "services_update_admin" ON public.services;

-- subscriptions
DROP POLICY IF EXISTS "Allow all for service role" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_admin" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;

-- usecase_history
DROP POLICY IF EXISTS "Users can view history" ON public.usecase_history;
DROP POLICY IF EXISTS "usecase_history_delete_via_usecase" ON public.usecase_history;
DROP POLICY IF EXISTS "Users can insert history for accessible usecases" ON public.usecase_history;
DROP POLICY IF EXISTS "Users can view history for accessible usecases" ON public.usecase_history;

-- usecase_nextsteps
DROP POLICY IF EXISTS "Users can insert nextsteps" ON public.usecase_nextsteps;
DROP POLICY IF EXISTS "Users can update nextsteps" ON public.usecase_nextsteps;
DROP POLICY IF EXISTS "Users can view nextsteps" ON public.usecase_nextsteps;
DROP POLICY IF EXISTS "usecase_nextsteps_delete_via_usecase" ON public.usecase_nextsteps;
DROP POLICY IF EXISTS "usecase_nextsteps_insert_via_usecase" ON public.usecase_nextsteps;
DROP POLICY IF EXISTS "usecase_nextsteps_select_admin" ON public.usecase_nextsteps;
DROP POLICY IF EXISTS "usecase_nextsteps_select_via_usecase" ON public.usecase_nextsteps;
DROP POLICY IF EXISTS "usecase_nextsteps_update_via_usecase" ON public.usecase_nextsteps;

-- usecase_responses
DROP POLICY IF EXISTS "Users can insert responses" ON public.usecase_responses;
DROP POLICY IF EXISTS "Users can update responses" ON public.usecase_responses;
DROP POLICY IF EXISTS "Users can view responses" ON public.usecase_responses;
DROP POLICY IF EXISTS "usecase_responses_delete_via_usecase" ON public.usecase_responses;
DROP POLICY IF EXISTS "usecase_responses_insert_via_usecase" ON public.usecase_responses;
DROP POLICY IF EXISTS "usecase_responses_select_admin" ON public.usecase_responses;
DROP POLICY IF EXISTS "usecase_responses_select_via_usecase" ON public.usecase_responses;
DROP POLICY IF EXISTS "usecase_responses_update_via_usecase" ON public.usecase_responses;

-- usecases
DROP POLICY IF EXISTS "Allow all for service role" ON public.usecases;
DROP POLICY IF EXISTS "Users can insert usecases in their companies" ON public.usecases;
DROP POLICY IF EXISTS "Users can update usecases of their companies" ON public.usecases;
DROP POLICY IF EXISTS "Users can view usecases of their companies" ON public.usecases;
DROP POLICY IF EXISTS "usecases_delete_company_member" ON public.usecases;
DROP POLICY IF EXISTS "usecases_insert_company_member" ON public.usecases;
DROP POLICY IF EXISTS "usecases_select_admin" ON public.usecases;
DROP POLICY IF EXISTS "usecases_select_company" ON public.usecases;
DROP POLICY IF EXISTS "usecases_select_direct_access" ON public.usecases;
DROP POLICY IF EXISTS "usecases_update_company_member" ON public.usecases;
DROP POLICY IF EXISTS "usecases_update_direct_access" ON public.usecases;

-- user_companies
DROP POLICY IF EXISTS "Users can view their company memberships" ON public.user_companies;
DROP POLICY IF EXISTS "user_companies_delete_owner" ON public.user_companies;
DROP POLICY IF EXISTS "user_companies_delete_self" ON public.user_companies;
DROP POLICY IF EXISTS "user_companies_insert_first_owner" ON public.user_companies;
DROP POLICY IF EXISTS "user_companies_insert_owner" ON public.user_companies;
DROP POLICY IF EXISTS "user_companies_select_admin" ON public.user_companies;
DROP POLICY IF EXISTS "user_companies_select_own" ON public.user_companies;
DROP POLICY IF EXISTS "user_companies_update_owner" ON public.user_companies;

-- user_profiles
DROP POLICY IF EXISTS "user_profiles_delete_involved" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_inviter" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_involved" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_inviter" ON public.user_profiles;

-- user_usecases
DROP POLICY IF EXISTS "user_usecases_delete_via_usecase" ON public.user_usecases;
DROP POLICY IF EXISTS "user_usecases_delete_company_member" ON public.user_usecases;
DROP POLICY IF EXISTS "user_usecases_insert_company_member" ON public.user_usecases;
DROP POLICY IF EXISTS "user_usecases_select_company_member" ON public.user_usecases;
DROP POLICY IF EXISTS "user_usecases_select_own" ON public.user_usecases;

-- =====================================================
-- PARTIE 3: CRÉATION DES NOUVELLES POLICIES (PROD)
-- =====================================================

-- companies
CREATE POLICY "companies_delete_owner" ON public.companies FOR DELETE TO authenticated USING (is_company_owner((select auth.uid()), id) OR is_super_admin((select auth.uid())));
CREATE POLICY "companies_insert_authenticated" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "companies_select_admin" ON public.companies FOR SELECT TO authenticated USING (is_admin_or_super_admin((select auth.uid())));
CREATE POLICY "companies_select_member" ON public.companies FOR SELECT TO authenticated USING (user_belongs_to_company((select auth.uid()), id));
CREATE POLICY "companies_update_admin" ON public.companies FOR UPDATE TO authenticated USING (is_admin_or_super_admin((select auth.uid())));
CREATE POLICY "companies_update_member" ON public.companies FOR UPDATE TO authenticated USING (user_belongs_to_company((select auth.uid()), id));

-- compl_ai_benchmarks
CREATE POLICY "compl_ai_benchmarks_delete_admin" ON public.compl_ai_benchmarks FOR DELETE TO authenticated USING (is_admin_or_super_admin((select auth.uid())));
CREATE POLICY "compl_ai_benchmarks_insert_admin" ON public.compl_ai_benchmarks FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))));
CREATE POLICY "compl_ai_benchmarks_select_authenticated" ON public.compl_ai_benchmarks FOR SELECT TO authenticated USING (true);
CREATE POLICY "compl_ai_benchmarks_update_admin" ON public.compl_ai_benchmarks FOR UPDATE TO authenticated USING (is_admin_or_super_admin((select auth.uid())));

-- compl_ai_evaluations
CREATE POLICY "compl_ai_evaluations_delete_admin" ON public.compl_ai_evaluations FOR DELETE TO authenticated USING (is_admin_or_super_admin((select auth.uid())));
CREATE POLICY "compl_ai_evaluations_insert_admin" ON public.compl_ai_evaluations FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))));
CREATE POLICY "compl_ai_evaluations_select_authenticated" ON public.compl_ai_evaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "compl_ai_evaluations_update_admin" ON public.compl_ai_evaluations FOR UPDATE TO authenticated USING (is_admin_or_super_admin((select auth.uid())));

-- compl_ai_models
CREATE POLICY "compl_ai_models_delete_admin" ON public.compl_ai_models FOR DELETE TO authenticated USING (is_admin_or_super_admin((select auth.uid())));
CREATE POLICY "compl_ai_models_insert_admin" ON public.compl_ai_models FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))));
CREATE POLICY "compl_ai_models_select_authenticated" ON public.compl_ai_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "compl_ai_models_update_admin" ON public.compl_ai_models FOR UPDATE TO authenticated USING (is_admin_or_super_admin((select auth.uid())));

-- compl_ai_principles
CREATE POLICY "compl_ai_principles_delete_admin" ON public.compl_ai_principles FOR DELETE TO authenticated USING (is_admin_or_super_admin((select auth.uid())));
CREATE POLICY "compl_ai_principles_insert_admin" ON public.compl_ai_principles FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))));
CREATE POLICY "compl_ai_principles_select_authenticated" ON public.compl_ai_principles FOR SELECT TO authenticated USING (true);
CREATE POLICY "compl_ai_principles_update_admin" ON public.compl_ai_principles FOR UPDATE TO authenticated USING (is_admin_or_super_admin((select auth.uid())));

-- compl_ai_sync_logs
CREATE POLICY "compl_ai_sync_logs_select_admin" ON public.compl_ai_sync_logs FOR SELECT TO authenticated USING (is_admin_or_super_admin((select auth.uid())));

-- contact_requests
CREATE POLICY "Users can insert their own contact requests" ON public.contact_requests FOR INSERT TO public WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own contact requests" ON public.contact_requests FOR SELECT TO public USING ((select auth.uid()) = user_id);

-- dossier_documents
CREATE POLICY "dossier_documents_insert" ON public.dossier_documents FOR INSERT TO public WITH CHECK (EXISTS ( SELECT 1 FROM dossiers d JOIN user_companies uc ON uc.company_id = d.company_id WHERE d.id = dossier_documents.dossier_id AND uc.user_id = (select auth.uid())));
CREATE POLICY "dossier_documents_select" ON public.dossier_documents FOR SELECT TO public USING (EXISTS ( SELECT 1 FROM dossiers d JOIN user_companies uc ON uc.company_id = d.company_id WHERE d.id = dossier_documents.dossier_id AND uc.user_id = (select auth.uid())));
CREATE POLICY "dossier_documents_update" ON public.dossier_documents FOR UPDATE TO public USING (EXISTS ( SELECT 1 FROM dossiers d JOIN user_companies uc ON uc.company_id = d.company_id WHERE d.id = dossier_documents.dossier_id AND uc.user_id = (select auth.uid()))) WITH CHECK (EXISTS ( SELECT 1 FROM dossiers d JOIN user_companies uc ON uc.company_id = d.company_id WHERE d.id = dossier_documents.dossier_id AND uc.user_id = (select auth.uid())));

-- dossiers
CREATE POLICY "dossiers_insert" ON public.dossiers FOR INSERT TO public WITH CHECK (EXISTS ( SELECT 1 FROM user_companies uc WHERE uc.company_id = dossiers.company_id AND uc.user_id = (select auth.uid())));
CREATE POLICY "dossiers_select" ON public.dossiers FOR SELECT TO authenticated USING (user_belongs_to_company((select auth.uid()), company_id));
CREATE POLICY "dossiers_update" ON public.dossiers FOR UPDATE TO authenticated USING (user_belongs_to_company((select auth.uid()), company_id));

-- model_providers
CREATE POLICY "model_providers_delete_admin" ON public.model_providers FOR DELETE TO authenticated USING (is_admin_or_super_admin((select auth.uid())));
CREATE POLICY "model_providers_insert_admin" ON public.model_providers FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))));
CREATE POLICY "model_providers_select_authenticated" ON public.model_providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "model_providers_update_admin" ON public.model_providers FOR UPDATE TO authenticated USING (is_admin_or_super_admin((select auth.uid())));

-- plans
CREATE POLICY "plans_delete_admin" ON public.plans FOR DELETE TO authenticated USING (is_admin_or_super_admin((select auth.uid())));
CREATE POLICY "plans_insert_admin" ON public.plans FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))));
CREATE POLICY "plans_select_authenticated" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "plans_select_public" ON public.plans FOR SELECT TO anon USING (true);
CREATE POLICY "plans_update_admin" ON public.plans FOR UPDATE TO authenticated USING (is_admin_or_super_admin((select auth.uid())));

-- profiles
CREATE POLICY "profiles_delete_super_admin" ON public.profiles FOR DELETE TO authenticated USING (is_super_admin((select auth.uid())));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT TO authenticated USING (is_admin_or_super_admin((select auth.uid())));
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING ((select auth.uid()) = id);
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE TO authenticated USING (is_admin_or_super_admin((select auth.uid())));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

-- services
CREATE POLICY "services_delete_admin" ON public.services FOR DELETE TO authenticated USING (is_admin_or_super_admin((select auth.uid())));
CREATE POLICY "services_insert_admin" ON public.services FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = (select auth.uid())) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))));
CREATE POLICY "services_select_authenticated" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "services_update_admin" ON public.services FOR UPDATE TO authenticated USING (is_admin_or_super_admin((select auth.uid())));

-- subscriptions
CREATE POLICY "subscriptions_select_admin" ON public.subscriptions FOR SELECT TO authenticated USING (is_admin_or_super_admin((select auth.uid())));
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

-- usecase_history
CREATE POLICY "Users can insert history for accessible usecases" ON public.usecase_history FOR INSERT TO public WITH CHECK ((((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid())) AND (usecase_id IN ( SELECT u.id FROM usecases u WHERE (u.company_id IN ( SELECT uc.company_id FROM user_companies uc WHERE (uc.user_id = (select auth.uid()))))))) OR (((select auth.uid()) IS NULL) AND (user_id IS NOT NULL) AND (usecase_id IN ( SELECT u.id FROM usecases u WHERE (u.company_id IN ( SELECT uc.company_id FROM user_companies uc WHERE (uc.user_id = usecase_history.user_id)))))));
CREATE POLICY "Users can view history for accessible usecases" ON public.usecase_history FOR SELECT TO public USING (usecase_id IN ( SELECT u.id FROM usecases u WHERE (u.company_id IN ( SELECT user_companies.company_id FROM user_companies WHERE (user_companies.user_id = (select auth.uid()))))));

-- usecase_nextsteps
CREATE POLICY "usecase_nextsteps_insert_via_usecase" ON public.usecase_nextsteps FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM usecases u JOIN user_companies uc ON uc.company_id = u.company_id WHERE u.id = usecase_nextsteps.usecase_id AND uc.user_id = (select auth.uid()))) OR (EXISTS ( SELECT 1 FROM user_usecases uu WHERE uu.usecase_id = usecase_nextsteps.usecase_id AND uu.user_id = (select auth.uid()))) OR is_admin_or_super_admin((select auth.uid())));
CREATE POLICY "usecase_nextsteps_select_admin" ON public.usecase_nextsteps FOR SELECT TO authenticated USING (is_admin_or_super_admin((select auth.uid())));
CREATE POLICY "usecase_nextsteps_select_via_usecase" ON public.usecase_nextsteps FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM usecases u JOIN user_companies uc ON uc.company_id = u.company_id WHERE u.id = usecase_nextsteps.usecase_id AND uc.user_id = (select auth.uid()))) OR (EXISTS ( SELECT 1 FROM user_usecases uu WHERE uu.usecase_id = usecase_nextsteps.usecase_id AND uu.user_id = (select auth.uid()))));
CREATE POLICY "usecase_nextsteps_update_via_usecase" ON public.usecase_nextsteps FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM usecases u JOIN user_companies uc ON uc.company_id = u.company_id WHERE u.id = usecase_nextsteps.usecase_id AND uc.user_id = (select auth.uid()))) OR (EXISTS ( SELECT 1 FROM user_usecases uu WHERE uu.usecase_id = usecase_nextsteps.usecase_id AND uu.user_id = (select auth.uid()))) OR is_admin_or_super_admin((select auth.uid())));

-- usecase_responses
CREATE POLICY "usecase_responses_delete_via_usecase" ON public.usecase_responses FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1 FROM usecases u JOIN user_companies uc ON uc.company_id = u.company_id WHERE u.id = usecase_responses.usecase_id AND uc.user_id = (select auth.uid()))) OR (EXISTS ( SELECT 1 FROM user_usecases uu WHERE uu.usecase_id = usecase_responses.usecase_id AND uu.user_id = (select auth.uid()))));
CREATE POLICY "usecase_responses_insert_via_usecase" ON public.usecase_responses FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM usecases u JOIN user_companies uc ON uc.company_id = u.company_id WHERE u.id = usecase_responses.usecase_id AND uc.user_id = (select auth.uid()))) OR (EXISTS ( SELECT 1 FROM user_usecases uu WHERE uu.usecase_id = usecase_responses.usecase_id AND uu.user_id = (select auth.uid()))));
CREATE POLICY "usecase_responses_select_admin" ON public.usecase_responses FOR SELECT TO authenticated USING (is_admin_or_super_admin((select auth.uid())));
CREATE POLICY "usecase_responses_select_via_usecase" ON public.usecase_responses FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM usecases u JOIN user_companies uc ON uc.company_id = u.company_id WHERE u.id = usecase_responses.usecase_id AND uc.user_id = (select auth.uid()))) OR (EXISTS ( SELECT 1 FROM user_usecases uu WHERE uu.usecase_id = usecase_responses.usecase_id AND uu.user_id = (select auth.uid()))));
CREATE POLICY "usecase_responses_update_via_usecase" ON public.usecase_responses FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM usecases u JOIN user_companies uc ON uc.company_id = u.company_id WHERE u.id = usecase_responses.usecase_id AND uc.user_id = (select auth.uid()))) OR (EXISTS ( SELECT 1 FROM user_usecases uu WHERE uu.usecase_id = usecase_responses.usecase_id AND uu.user_id = (select auth.uid()))));

-- usecases
CREATE POLICY "usecases_delete_company_member" ON public.usecases FOR DELETE TO authenticated USING (user_belongs_to_company((select auth.uid()), company_id));
CREATE POLICY "usecases_insert_company_member" ON public.usecases FOR INSERT TO authenticated WITH CHECK (user_belongs_to_company((select auth.uid()), company_id));
CREATE POLICY "usecases_select_admin" ON public.usecases FOR SELECT TO authenticated USING (is_admin_or_super_admin((select auth.uid())));
CREATE POLICY "usecases_select_company" ON public.usecases FOR SELECT TO authenticated USING (user_belongs_to_company((select auth.uid()), company_id));
CREATE POLICY "usecases_select_direct_access" ON public.usecases FOR SELECT TO authenticated USING (user_has_usecase_access((select auth.uid()), id));
CREATE POLICY "usecases_update_company_member" ON public.usecases FOR UPDATE TO authenticated USING (user_belongs_to_company((select auth.uid()), company_id));
CREATE POLICY "usecases_update_direct_access" ON public.usecases FOR UPDATE TO authenticated USING (user_has_usecase_access((select auth.uid()), id));

-- user_companies
CREATE POLICY "user_companies_delete_owner" ON public.user_companies FOR DELETE TO authenticated USING (is_company_owner((select auth.uid()), company_id));
CREATE POLICY "user_companies_delete_self" ON public.user_companies FOR DELETE TO authenticated USING ((user_id = (select auth.uid())) AND (role <> 'owner'::text));
CREATE POLICY "user_companies_insert_first_owner" ON public.user_companies FOR INSERT TO authenticated WITH CHECK ((user_id = (select auth.uid())) AND (role = 'owner'::text) AND (NOT (EXISTS ( SELECT 1 FROM user_companies uc WHERE ((uc.company_id = user_companies.company_id) AND (uc.role = 'owner'::text))))));
CREATE POLICY "user_companies_insert_owner" ON public.user_companies FOR INSERT TO authenticated WITH CHECK (is_company_owner((select auth.uid()), company_id));
CREATE POLICY "user_companies_select_admin" ON public.user_companies FOR SELECT TO authenticated USING (is_admin_or_super_admin((select auth.uid())));
CREATE POLICY "user_companies_select_own" ON public.user_companies FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "user_companies_update_owner" ON public.user_companies FOR UPDATE TO authenticated USING (is_company_owner((select auth.uid()), company_id));

-- user_profiles
CREATE POLICY "user_profiles_delete_involved" ON public.user_profiles FOR DELETE TO authenticated USING ((inviter_user_id = (select auth.uid())) OR (invited_user_id = (select auth.uid())));
CREATE POLICY "user_profiles_insert_inviter" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (inviter_user_id = (select auth.uid()));
CREATE POLICY "user_profiles_select_involved" ON public.user_profiles FOR SELECT TO authenticated USING ((inviter_user_id = (select auth.uid())) OR (invited_user_id = (select auth.uid())));
CREATE POLICY "user_profiles_update_inviter" ON public.user_profiles FOR UPDATE TO authenticated USING (inviter_user_id = (select auth.uid()));

-- user_usecases
CREATE POLICY "user_usecases_delete_company_member" ON public.user_usecases FOR DELETE TO authenticated USING (user_has_company_usecase_access((select auth.uid()), usecase_id));
CREATE POLICY "user_usecases_insert_company_member" ON public.user_usecases FOR INSERT TO authenticated WITH CHECK (user_has_company_usecase_access((select auth.uid()), usecase_id));
CREATE POLICY "user_usecases_select_company_member" ON public.user_usecases FOR SELECT TO authenticated USING (user_has_company_usecase_access((select auth.uid()), usecase_id));
CREATE POLICY "user_usecases_select_own" ON public.user_usecases FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

-- =====================================================
-- PARTIE 4: ACTIVATION RLS SUR TOUTES LES TABLES
-- =====================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compl_ai_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compl_ai_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compl_ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compl_ai_principles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compl_ai_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usecase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usecase_nextsteps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usecase_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usecases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usecases ENABLE ROW LEVEL SECURITY;
