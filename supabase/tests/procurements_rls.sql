-- Run with: npm run supabase:ovh -- query -f supabase/tests/procurements_rls.sql
-- The exception block rolls back every fixture and write, including on failure.
DO $tests$
DECLARE
  affected integer;
BEGIN
  BEGIN
    INSERT INTO auth.users (id, email) VALUES
      ('71000000-0000-4000-8000-000000000001', 'procurements-rls-a@example.invalid'),
      ('71000000-0000-4000-8000-000000000002', 'procurements-rls-b@example.invalid');

    INSERT INTO public.procurements (user_id, title) VALUES
      ('71000000-0000-4000-8000-000000000002', 'Private B');

    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);
    INSERT INTO public.procurements (user_id, title) VALUES
      ('71000000-0000-4000-8000-000000000001', 'Private A');

    IF (SELECT count(*) FROM public.procurements) <> 1
      OR NOT EXISTS (SELECT 1 FROM public.procurements WHERE title = 'Private A') THEN
      RAISE EXCEPTION 'FAIL: creator A must see only their own procurement';
    END IF;

    BEGIN
      INSERT INTO public.procurements (user_id, title)
        VALUES ('71000000-0000-4000-8000-000000000002', 'Spoofed owner');
      RAISE EXCEPTION 'FAIL: inserting for another owner must be denied';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      UPDATE public.procurements SET title = 'Changed';
      RAISE EXCEPTION 'FAIL: authenticated UPDATE must be denied';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    DELETE FROM public.procurements WHERE title = 'Private B';
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN
      RAISE EXCEPTION 'FAIL: deleting another creator procurement must be denied';
    END IF;

    PERFORM set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000002', true);
    IF (SELECT count(*) FROM public.procurements) <> 1
      OR NOT EXISTS (SELECT 1 FROM public.procurements WHERE title = 'Private B') THEN
      RAISE EXCEPTION 'FAIL: creator B must see only their own procurement';
    END IF;

    DELETE FROM public.procurements WHERE title = 'Private B';
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 1 THEN
      RAISE EXCEPTION 'FAIL: creator B must be able to delete their own procurement';
    END IF;

    PERFORM set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);
    IF (SELECT count(*) FROM public.procurements) <> 1 THEN
      RAISE EXCEPTION 'FAIL: creator A procurement must remain after B deletion';
    END IF;
    DELETE FROM public.procurements WHERE title = 'Private A';
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 1 OR (SELECT count(*) FROM public.procurements) <> 0 THEN
      RAISE EXCEPTION 'FAIL: creator A must be able to delete their own procurement';
    END IF;

    RESET ROLE;
    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claim.sub', '', true);
    BEGIN
      PERFORM * FROM public.procurements;
      RAISE EXCEPTION 'FAIL: anonymous SELECT must be denied';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      DELETE FROM public.procurements;
      RAISE EXCEPTION 'FAIL: anonymous DELETE must be denied';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      INSERT INTO public.procurements (user_id, title)
        VALUES ('71000000-0000-4000-8000-000000000001', 'Anonymous');
      RAISE EXCEPTION 'FAIL: anonymous INSERT must be denied';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RESET ROLE;

    RAISE SQLSTATE 'ZX001' USING MESSAGE = 'Rollback test fixtures';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN
    RAISE NOTICE 'PASS: procurements ownership, isolation, owner deletion and anonymous denial';
  END;
END;
$tests$;
