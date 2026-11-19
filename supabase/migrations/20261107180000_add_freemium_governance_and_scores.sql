-- Freemium gouvernance : profils, cycle de vie 24 h, scores d'intégrité, alertes admin.
-- N'altère pas usecases.status, score_base, score_model ni score_final.

-- ---------------------------------------------------------------------------
-- 1. public.profiles
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_type text NOT NULL DEFAULT 'company';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS naf_code text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS siren_verified_pappers boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS academic_institution text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS academic_department text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS entity_trust_score integer NOT NULL DEFAULT 50;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS engagement_score integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS siren_collision_flag boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_reset_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_reset_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_profile_type_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_profile_type_check
      CHECK (profile_type IN ('company', 'advisor', 'academic'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_entity_trust_score_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_entity_trust_score_check
      CHECK (entity_trust_score >= 0 AND entity_trust_score <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_engagement_score_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_engagement_score_check
      CHECK (engagement_score >= 0 AND engagement_score <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_monthly_reset_count_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_monthly_reset_count_check
      CHECK (monthly_reset_count >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_siren_non_null
  ON public.profiles (siren)
  WHERE siren IS NOT NULL AND siren <> '';

-- ---------------------------------------------------------------------------
-- 2. Trigger anti-triche : un client authenticated non admin ne réécrit pas
--    les colonnes de gouvernance.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_profile_governance_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF current_setting('role', true) = 'authenticated'
     AND NOT public.is_admin_or_super_admin(auth.uid()) THEN
    NEW.entity_trust_score := OLD.entity_trust_score;
    NEW.engagement_score := OLD.engagement_score;
    NEW.siren_collision_flag := OLD.siren_collision_flag;
    NEW.monthly_reset_count := OLD.monthly_reset_count;
    NEW.last_reset_at := OLD.last_reset_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_governance_columns ON public.profiles;

CREATE TRIGGER trg_protect_profile_governance_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_governance_columns();

-- ---------------------------------------------------------------------------
-- 3. public.companies
-- ---------------------------------------------------------------------------

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'active';

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS deletion_token_hash text;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS purge_requested_at timestamptz;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS purge_available_at timestamptz;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS soft_deleted_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'companies_lifecycle_status_check'
      AND conrelid = 'public.companies'::regclass
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_lifecycle_status_check
      CHECK (lifecycle_status IN ('active', 'awaiting_email_confirm', 'purging_24h', 'soft_deleted'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_companies_lifecycle_purge
  ON public.companies (lifecycle_status, purge_available_at);

-- ---------------------------------------------------------------------------
-- 4. public.usecases (colonnes nouvelles uniquement)
-- ---------------------------------------------------------------------------

ALTER TABLE public.usecases
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'active';

ALTER TABLE public.usecases
  ADD COLUMN IF NOT EXISTS deletion_token_hash text;

ALTER TABLE public.usecases
  ADD COLUMN IF NOT EXISTS purge_requested_at timestamptz;

ALTER TABLE public.usecases
  ADD COLUMN IF NOT EXISTS purge_available_at timestamptz;

ALTER TABLE public.usecases
  ADD COLUMN IF NOT EXISTS soft_deleted_at timestamptz;

ALTER TABLE public.usecases
  ADD COLUMN IF NOT EXISTS audit_integrity_score integer;

ALTER TABLE public.usecases
  ADD COLUMN IF NOT EXISTS input_telemetry jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'usecases_lifecycle_status_check'
      AND conrelid = 'public.usecases'::regclass
  ) THEN
    ALTER TABLE public.usecases
      ADD CONSTRAINT usecases_lifecycle_status_check
      CHECK (lifecycle_status IN ('active', 'awaiting_email_confirm', 'purging_24h', 'soft_deleted'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'usecases_audit_integrity_score_check'
      AND conrelid = 'public.usecases'::regclass
  ) THEN
    ALTER TABLE public.usecases
      ADD CONSTRAINT usecases_audit_integrity_score_check
      CHECK (
        audit_integrity_score IS NULL
        OR (audit_integrity_score >= 0 AND audit_integrity_score <= 100)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_usecases_lifecycle_purge
  ON public.usecases (lifecycle_status, purge_available_at);

-- ---------------------------------------------------------------------------
-- 5. public.admin_alerts
-- FK ON DELETE CASCADE vers public.profiles(id) : aucune alerte orpheline
-- quand cleanupTestData ou une suppression de profil retire le profil lié
-- (primaire ou secondaire).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL DEFAULT 'SIREN_COLLISION'
    CHECK (alert_type IN ('SIREN_COLLISION')),
  siren text NOT NULL,
  primary_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  secondary_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'resolved')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_alerts IS
  'Alertes admin MaydAI. primary_profile_id et secondary_profile_id référencent public.profiles(id) ON DELETE CASCADE pour éviter tout orphelin lors du nettoyage E2E cleanupTestData ou de la suppression d''un profil.';

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_alerts TO service_role;

DROP POLICY IF EXISTS admin_alerts_select_admin ON public.admin_alerts;
CREATE POLICY admin_alerts_select_admin
  ON public.admin_alerts
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_super_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS admin_alerts_insert_admin ON public.admin_alerts;
CREATE POLICY admin_alerts_insert_admin
  ON public.admin_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_super_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS admin_alerts_update_admin ON public.admin_alerts;
CREATE POLICY admin_alerts_update_admin
  ON public.admin_alerts
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_super_admin((SELECT auth.uid())))
  WITH CHECK (public.is_admin_or_super_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS admin_alerts_delete_admin ON public.admin_alerts;
CREATE POLICY admin_alerts_delete_admin
  ON public.admin_alerts
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_super_admin((SELECT auth.uid())));

-- ---------------------------------------------------------------------------
-- 6. public.user_device_sessions
-- FK ON DELETE CASCADE vers auth.users(id) : aucune session orpheline
-- à la suppression d'un utilisateur.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_device_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  device_id text NOT NULL,
  user_agent_hash text,
  ip_hash text,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_device_sessions_user_device_unique UNIQUE (user_id, device_id)
);

COMMENT ON TABLE public.user_device_sessions IS
  'Sessions appareil. user_id référence auth.users(id) ON DELETE CASCADE pour éviter tout orphelin à la suppression d''un utilisateur.';

ALTER TABLE public.user_device_sessions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_device_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_device_sessions TO service_role;

DROP POLICY IF EXISTS user_device_sessions_select_owner_or_admin ON public.user_device_sessions;
CREATE POLICY user_device_sessions_select_owner_or_admin
  ON public.user_device_sessions
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin_or_super_admin((SELECT auth.uid()))
  );

DROP POLICY IF EXISTS user_device_sessions_insert_owner_or_admin ON public.user_device_sessions;
CREATE POLICY user_device_sessions_insert_owner_or_admin
  ON public.user_device_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_admin_or_super_admin((SELECT auth.uid()))
  );

DROP POLICY IF EXISTS user_device_sessions_update_owner_or_admin ON public.user_device_sessions;
CREATE POLICY user_device_sessions_update_owner_or_admin
  ON public.user_device_sessions
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin_or_super_admin((SELECT auth.uid()))
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_admin_or_super_admin((SELECT auth.uid()))
  );

DROP POLICY IF EXISTS user_device_sessions_delete_owner_or_admin ON public.user_device_sessions;
CREATE POLICY user_device_sessions_delete_owner_or_admin
  ON public.user_device_sessions
  FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin_or_super_admin((SELECT auth.uid()))
  );

NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- DOWN (Rollback)
-- ---------------------------------------------------------------------------
-- DROP POLICY IF EXISTS user_device_sessions_delete_owner_or_admin ON public.user_device_sessions;
-- DROP POLICY IF EXISTS user_device_sessions_update_owner_or_admin ON public.user_device_sessions;
-- DROP POLICY IF EXISTS user_device_sessions_insert_owner_or_admin ON public.user_device_sessions;
-- DROP POLICY IF EXISTS user_device_sessions_select_owner_or_admin ON public.user_device_sessions;
-- DROP TABLE IF EXISTS public.user_device_sessions;
--
-- DROP POLICY IF EXISTS admin_alerts_delete_admin ON public.admin_alerts;
-- DROP POLICY IF EXISTS admin_alerts_update_admin ON public.admin_alerts;
-- DROP POLICY IF EXISTS admin_alerts_insert_admin ON public.admin_alerts;
-- DROP POLICY IF EXISTS admin_alerts_select_admin ON public.admin_alerts;
-- DROP TABLE IF EXISTS public.admin_alerts;
--
-- DROP INDEX IF EXISTS public.idx_usecases_lifecycle_purge;
-- ALTER TABLE public.usecases DROP CONSTRAINT IF EXISTS usecases_audit_integrity_score_check;
-- ALTER TABLE public.usecases DROP CONSTRAINT IF EXISTS usecases_lifecycle_status_check;
-- ALTER TABLE public.usecases DROP COLUMN IF EXISTS input_telemetry;
-- ALTER TABLE public.usecases DROP COLUMN IF EXISTS audit_integrity_score;
-- ALTER TABLE public.usecases DROP COLUMN IF EXISTS soft_deleted_at;
-- ALTER TABLE public.usecases DROP COLUMN IF EXISTS purge_available_at;
-- ALTER TABLE public.usecases DROP COLUMN IF EXISTS purge_requested_at;
-- ALTER TABLE public.usecases DROP COLUMN IF EXISTS deletion_token_hash;
-- ALTER TABLE public.usecases DROP COLUMN IF EXISTS lifecycle_status;
--
-- DROP INDEX IF EXISTS public.idx_companies_lifecycle_purge;
-- ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_lifecycle_status_check;
-- ALTER TABLE public.companies DROP COLUMN IF EXISTS soft_deleted_at;
-- ALTER TABLE public.companies DROP COLUMN IF EXISTS purge_available_at;
-- ALTER TABLE public.companies DROP COLUMN IF EXISTS purge_requested_at;
-- ALTER TABLE public.companies DROP COLUMN IF EXISTS deletion_token_hash;
-- ALTER TABLE public.companies DROP COLUMN IF EXISTS lifecycle_status;
--
-- DROP TRIGGER IF EXISTS trg_protect_profile_governance_columns ON public.profiles;
-- DROP FUNCTION IF EXISTS public.protect_profile_governance_columns();
-- DROP INDEX IF EXISTS public.idx_profiles_siren_non_null;
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_monthly_reset_count_check;
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_engagement_score_check;
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_entity_trust_score_check;
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_profile_type_check;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_reset_at;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS monthly_reset_count;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS siren_collision_flag;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS engagement_score;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS entity_trust_score;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS academic_department;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS academic_institution;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS siren_verified_pappers;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS naf_code;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS profile_type;
