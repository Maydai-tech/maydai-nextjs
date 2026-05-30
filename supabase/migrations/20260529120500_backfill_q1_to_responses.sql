-- Backfill : persister E4.N7.Q1 dans usecase_responses depuis checklist_gov_usecase
--
-- Contexte :
--   Parcours courts dont le rôle entreprise (E4.N7.Q1) n'a jamais été écrit dans
--   usecase_responses, mais dont un code E4.N7.Q1.[ABC] subsiste encore en checklist.
--
-- Cible :
--   path_mode = 'short'
--   absent de usecase_responses pour question_code = 'E4.N7.Q1'
--   présent dans checklist_gov_usecase : E4.N7.Q1.A | .B | .C

BEGIN;

CREATE TABLE IF NOT EXISTS usecase_responses_q1_backfill_20260529 (
  usecase_id uuid PRIMARY KEY,
  response_id uuid NOT NULL,
  single_value text NOT NULL,
  backfilled_at timestamptz NOT NULL DEFAULT NOW()
);

WITH candidates AS (
  SELECT
    u.id AS usecase_id,
    (
      SELECT chk.code
      FROM jsonb_array_elements_text(COALESCE(u.checklist_gov_usecase, '[]'::jsonb)) AS chk(code)
      WHERE chk.code ~ '^E4\.N7\.Q1\.[ABC]$'
      ORDER BY chk.code
      LIMIT 1
    ) AS q1_code
  FROM usecases u
  WHERE u.path_mode = 'short'
    AND NOT EXISTS (
      SELECT 1
      FROM usecase_responses ur
      WHERE ur.usecase_id = u.id
        AND ur.question_code = 'E4.N7.Q1'
    )
),
eligible AS (
  SELECT usecase_id, q1_code
  FROM candidates
  WHERE q1_code IS NOT NULL
),
inserted AS (
  INSERT INTO usecase_responses (
    usecase_id,
    question_code,
    single_value,
    answered_by,
    answered_at,
    updated_at
  )
  SELECT
    e.usecase_id,
    'E4.N7.Q1',
    e.q1_code,
    'migration:20260529120500_backfill_q1_to_responses',
    NOW(),
    NOW()
  FROM eligible e
  ON CONFLICT (usecase_id, question_code) DO NOTHING
  RETURNING id, usecase_id, single_value
)
INSERT INTO usecase_responses_q1_backfill_20260529 (usecase_id, response_id, single_value)
SELECT i.usecase_id, i.id, i.single_value
FROM inserted i
ON CONFLICT (usecase_id) DO NOTHING;

COMMIT;

-- =============================================================================
-- DOWN (référence manuelle — non exécuté par Supabase CLI)
-- =============================================================================
-- Supprime uniquement les lignes insérées par cette migration (table de backup).
--
-- BEGIN;
--
-- DELETE FROM usecase_responses ur
-- USING usecase_responses_q1_backfill_20260529 b
-- WHERE ur.id = b.response_id
--   AND ur.question_code = 'E4.N7.Q1'
--   AND ur.answered_by = 'migration:20260529120500_backfill_q1_to_responses';
--
-- DROP TABLE IF EXISTS usecase_responses_q1_backfill_20260529;
--
-- COMMIT;
