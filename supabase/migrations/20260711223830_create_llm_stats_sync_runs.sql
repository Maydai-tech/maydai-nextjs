CREATE TABLE IF NOT EXISTS public.llm_stats_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'partial', 'error')),
  models_fetched integer NOT NULL DEFAULT 0 CHECK (models_fetched >= 0),
  models_created integer NOT NULL DEFAULT 0 CHECK (models_created >= 0),
  models_updated integer NOT NULL DEFAULT 0 CHECK (models_updated >= 0),
  models_unchanged integer NOT NULL DEFAULT 0 CHECK (models_unchanged >= 0),
  created_models jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_models jsonb NOT NULL DEFAULT '[]'::jsonb,
  errors text[] NOT NULL DEFAULT ARRAY[]::text[],
  email_sent boolean NOT NULL DEFAULT false,
  failure_email_sent boolean NOT NULL DEFAULT false,
  execution_time_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS llm_stats_sync_runs_started_at_idx
  ON public.llm_stats_sync_runs (started_at DESC);

CREATE INDEX IF NOT EXISTS llm_stats_sync_runs_status_idx
  ON public.llm_stats_sync_runs (status);

ALTER TABLE public.llm_stats_sync_runs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.llm_stats_sync_runs TO authenticated;
GRANT SELECT, INSERT ON TABLE public.llm_stats_sync_runs TO service_role;
NOTIFY pgrst, 'reload schema';

CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id
    AND role IN ('admin', 'super_admin')
  );
$function$;

REVOKE ALL ON FUNCTION public.is_admin_or_super_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS "llm_stats_sync_runs_select_admin" ON public.llm_stats_sync_runs;
CREATE POLICY "llm_stats_sync_runs_select_admin"
  ON public.llm_stats_sync_runs
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_super_admin((select auth.uid())));
