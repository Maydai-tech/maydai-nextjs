-- MAY-24 : fournisseurs d'un appel d'offre (entreprise, SIREN, email du contact).
-- Remplace la lecture de procurements.supplier_emails, conservée pour l'historique.
CREATE TABLE public.procurement_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procurement_id uuid NOT NULL REFERENCES public.procurements(id) ON DELETE CASCADE,
  contact_email text NOT NULL CHECK (contact_email = lower(btrim(contact_email)) AND contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  company_name text CHECK (company_name IS NULL OR char_length(btrim(company_name)) BETWEEN 1 AND 200),
  siren text CHECK (siren IS NULL OR siren ~ '^[0-9]{9}$'),
  city text CHECK (city IS NULL OR char_length(city) <= 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (procurement_id, contact_email)
);

-- Sert aussi à retrouver les appels reçus par un fournisseur (MAY-5).
CREATE INDEX procurement_suppliers_contact_email_idx ON public.procurement_suppliers (contact_email);

ALTER TABLE public.procurement_suppliers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.procurement_suppliers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procurement_suppliers TO authenticated;
GRANT ALL ON public.procurement_suppliers TO service_role;

-- Seul le propriétaire de l'appel d'offre lit et gère ses fournisseurs.
CREATE POLICY procurement_suppliers_owner ON public.procurement_suppliers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.procurements p WHERE p.id = procurement_id AND p.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.procurements p WHERE p.id = procurement_id AND p.user_id = (SELECT auth.uid())));

-- Reprise des emails déjà saisis (entreprise non renseignée).
INSERT INTO public.procurement_suppliers (procurement_id, contact_email)
SELECT p.id, lower(btrim(email))
FROM public.procurements p, unnest(p.supplier_emails) AS email
WHERE lower(btrim(email)) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
ON CONFLICT (procurement_id, contact_email) DO NOTHING;

NOTIFY pgrst, 'reload schema';
