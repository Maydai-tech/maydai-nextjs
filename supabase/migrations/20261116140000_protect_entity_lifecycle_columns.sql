-- Freemium gouvernance : un membre authenticated (RLS companies_update_member /
-- usecases_update_company_member) ne doit pas pouvoir écrire le cycle de vie.
-- Sans ce trigger, un PATCH PostgREST { lifecycle_status: 'purging_24h',
-- purge_available_at: <passé> } suffit pour que le cron process-purges
-- soft-delete puis hard-delete le registre / cas. Idem pour soft_deleted
-- (libération immédiate du slot freemium, sans quota ni e-mail).
-- Aligné sur protect_profile_governance_columns (même migration 20261107).

CREATE OR REPLACE FUNCTION public.protect_company_lifecycle_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF current_setting('role', true) = 'authenticated'
     AND NOT public.is_admin_or_super_admin(auth.uid()) THEN
    NEW.lifecycle_status := OLD.lifecycle_status;
    NEW.deletion_token_hash := OLD.deletion_token_hash;
    NEW.purge_requested_at := OLD.purge_requested_at;
    NEW.purge_available_at := OLD.purge_available_at;
    NEW.soft_deleted_at := OLD.soft_deleted_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_company_lifecycle_columns ON public.companies;

CREATE TRIGGER trg_protect_company_lifecycle_columns
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_company_lifecycle_columns();

CREATE OR REPLACE FUNCTION public.protect_usecase_lifecycle_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF current_setting('role', true) = 'authenticated'
     AND NOT public.is_admin_or_super_admin(auth.uid()) THEN
    NEW.lifecycle_status := OLD.lifecycle_status;
    NEW.deletion_token_hash := OLD.deletion_token_hash;
    NEW.purge_requested_at := OLD.purge_requested_at;
    NEW.purge_available_at := OLD.purge_available_at;
    NEW.soft_deleted_at := OLD.soft_deleted_at;
    NEW.audit_integrity_score := OLD.audit_integrity_score;
    NEW.input_telemetry := OLD.input_telemetry;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_usecase_lifecycle_columns ON public.usecases;

CREATE TRIGGER trg_protect_usecase_lifecycle_columns
  BEFORE UPDATE ON public.usecases
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_usecase_lifecycle_columns();

-- ---------------------------------------------------------------------------
-- DOWN (Rollback)
-- ---------------------------------------------------------------------------
-- DROP TRIGGER IF EXISTS trg_protect_usecase_lifecycle_columns ON public.usecases;
-- DROP FUNCTION IF EXISTS public.protect_usecase_lifecycle_columns();
-- DROP TRIGGER IF EXISTS trg_protect_company_lifecycle_columns ON public.companies;
-- DROP FUNCTION IF EXISTS public.protect_company_lifecycle_columns();
