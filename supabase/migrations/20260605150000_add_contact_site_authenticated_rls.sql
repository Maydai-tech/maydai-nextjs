-- ==========================================
-- MIGRATION UP
-- RLS : soumission de tickets par utilisateurs authentifiés
-- ==========================================

-- Autoriser les utilisateurs connectés à soumettre un ticket de support
CREATE POLICY "contact_site_insert_authenticated" ON public.contact_site
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ==========================================
-- MIGRATION DOWN (rollback manuel)
-- ==========================================
-- DROP POLICY IF EXISTS "contact_site_insert_authenticated" ON public.contact_site;
