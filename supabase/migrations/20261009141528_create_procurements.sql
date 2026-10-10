CREATE TABLE public.procurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX procurements_user_created_at_idx
  ON public.procurements (user_id, created_at DESC, id DESC);

ALTER TABLE public.procurements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.procurements FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.procurements TO authenticated;
GRANT ALL ON public.procurements TO service_role;

CREATE POLICY procurements_select_own ON public.procurements
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY procurements_insert_own ON public.procurements
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Expose the new table immediately on the self-hosted PostgREST instance.
NOTIFY pgrst, 'reload schema';
