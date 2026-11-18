-- MAY-5 / MAY-29 : un fournisseur (son email figure parmi les fournisseurs d'un appel d'offre)
-- consulte les appels reçus, en lecture seule.
-- Fonctions SECURITY DEFINER plutôt qu'une policy sur procurements : une policy donnerait accès
-- à toutes les colonnes (pondérations, emails des autres fournisseurs).

CREATE FUNCTION public.list_received_procurements()
RETURNS TABLE (id uuid, title text, description text, phase text, deadline_at timestamptz, created_at timestamptz, buyer_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p.id, p.title, p.description, p.phase, p.deadline_at, p.created_at,
    COALESCE(NULLIF(btrim(pr.company_name), ''), NULLIF(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''), 'Acheteur')
  FROM public.procurement_suppliers s
  JOIN public.procurements p ON p.id = s.procurement_id
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  WHERE (SELECT auth.uid()) IS NOT NULL
    AND s.contact_email = lower((SELECT auth.jwt() ->> 'email'))
    AND p.user_id <> (SELECT auth.uid())
  ORDER BY p.deadline_at NULLS LAST, p.created_at DESC;
$$;

CREATE FUNCTION public.get_received_procurement(p_id uuid)
RETURNS TABLE (id uuid, title text, description text, phase text, deadline_at timestamptz, created_at timestamptz, custom_questions jsonb, buyer_name text, supplier_company_name text, supplier_email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p.id, p.title, p.description, p.phase, p.deadline_at, p.created_at, p.custom_questions,
    COALESCE(NULLIF(btrim(pr.company_name), ''), NULLIF(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''), 'Acheteur'),
    s.company_name, s.contact_email
  FROM public.procurement_suppliers s
  JOIN public.procurements p ON p.id = s.procurement_id
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  WHERE p.id = p_id
    AND (SELECT auth.uid()) IS NOT NULL
    AND s.contact_email = lower((SELECT auth.jwt() ->> 'email'))
    AND p.user_id <> (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.list_received_procurements() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_received_procurement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_received_procurements() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_received_procurement(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
