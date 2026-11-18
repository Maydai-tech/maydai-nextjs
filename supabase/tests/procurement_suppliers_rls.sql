-- MAY-24 / MAY-5 / MAY-29. Local : psql -h 127.0.0.1 -p 55322 -U postgres -f supabase/tests/procurement_suppliers_rls.sql
-- Le bloc d'exception annule toutes les données de test, y compris en cas d'échec.
DO $tests$
DECLARE
  affected integer;
  proc_a uuid := '76000000-0000-4000-8000-0000000000a1';
BEGIN
  BEGIN
    INSERT INTO auth.users (id, email) VALUES
      ('76000000-0000-4000-8000-000000000001', 'buyer-rls@example.invalid'),
      ('76000000-0000-4000-8000-000000000002', 'supplier-rls@example.invalid'),
      ('76000000-0000-4000-8000-000000000003', 'outsider-rls@example.invalid');
    INSERT INTO public.procurements (id, user_id, title, description, criteria_importance, supplier_emails) VALUES
      (proc_a, '76000000-0000-4000-8000-000000000001', 'Appel A', 'Besoin A',
       '{"human_oversight":9,"transparency":5,"social_ethics":5,"environment":5,"cybersecurity":5,"data_governance":5}', '{}');

    SET LOCAL ROLE authenticated;

    -- Acheteur : gère ses fournisseurs.
    PERFORM set_config('request.jwt.claims', '{"sub":"76000000-0000-4000-8000-000000000001","email":"buyer-rls@example.invalid"}', true);
    INSERT INTO public.procurement_suppliers (procurement_id, contact_email, company_name) VALUES
      (proc_a, 'supplier-rls@example.invalid', 'Fournisseur'),
      (proc_a, 'other-supplier@example.invalid', 'Concurrent');
    IF (SELECT count(*) FROM public.procurement_suppliers) <> 2 THEN
      RAISE EXCEPTION 'FAIL: buyer must see their two suppliers';
    END IF;

    -- Fournisseur : aucune lecture directe des tables, seulement les fonctions limitées.
    PERFORM set_config('request.jwt.claims', '{"sub":"76000000-0000-4000-8000-000000000002","email":"Supplier-RLS@example.invalid"}', true);
    IF (SELECT count(*) FROM public.procurement_suppliers) <> 0 OR (SELECT count(*) FROM public.procurements) <> 0 THEN
      RAISE EXCEPTION 'FAIL: supplier must not read procurements or suppliers directly';
    END IF;
    IF (SELECT count(*) FROM public.list_received_procurements()) <> 1 THEN
      RAISE EXCEPTION 'FAIL: supplier must list the received procurement (email case-insensitive)';
    END IF;
    IF (SELECT supplier_company_name FROM public.get_received_procurement(proc_a)) <> 'Fournisseur' THEN
      RAISE EXCEPTION 'FAIL: supplier must read their own supplier row only';
    END IF;
    BEGIN
      INSERT INTO public.procurement_suppliers (procurement_id, contact_email) VALUES (proc_a, 'intrus@example.invalid');
      RAISE EXCEPTION 'FAIL: supplier must not add suppliers';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    DELETE FROM public.procurement_suppliers;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN
      RAISE EXCEPTION 'FAIL: supplier must not delete suppliers';
    END IF;

    -- Tiers : ne voit rien.
    PERFORM set_config('request.jwt.claims', '{"sub":"76000000-0000-4000-8000-000000000003","email":"outsider-rls@example.invalid"}', true);
    IF (SELECT count(*) FROM public.list_received_procurements()) <> 0 OR EXISTS (SELECT 1 FROM public.get_received_procurement(proc_a)) THEN
      RAISE EXCEPTION 'FAIL: outsider must not see the procurement';
    END IF;

    RESET ROLE;
    SET LOCAL ROLE anon;
    BEGIN
      PERFORM * FROM public.list_received_procurements();
      RAISE EXCEPTION 'FAIL: anonymous call must be denied';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RESET ROLE;

    RAISE SQLSTATE 'ZX001' USING MESSAGE = 'Rollback test fixtures';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN
    RAISE NOTICE 'PASS: suppliers owner access, supplier read-only functions, outsider and anonymous denial';
  END;
END;
$tests$;
