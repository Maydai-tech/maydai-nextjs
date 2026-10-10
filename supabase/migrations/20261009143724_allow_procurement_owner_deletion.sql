GRANT DELETE ON public.procurements TO authenticated;

CREATE POLICY procurements_delete_own ON public.procurements
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

NOTIFY pgrst, 'reload schema';
