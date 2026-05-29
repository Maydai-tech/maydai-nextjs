-- Remédiation : company_status = 'unknown' sur parcours courts V3
--
-- Contexte :
--   - E4.N7.Q1 (rôle entreprise) n'était plus persistée dans usecase_responses
--   - Les mises à jour checklist_gov_usecase (E6 only) écrasaient les codes E4.N7.Q1.*
--   - determineCompanyStatus retournait 'unknown' au recalcul
--
-- Stratégie UP (par use case, dans l'ordre) :
--   1. Dernière entrée usecase_history (field_updated, field_name = 'E4.N7.Q1') → new_value
--   2. Sinon usecase_responses.single_value pour E4.N7.Q1
--   3. Sinon code E4.N7.Q1.[ABC] encore présent dans checklist_gov_usecase
--
-- Mapping :
--   E4.N7.Q1.B → utilisateur (déployeur)
--   E4.N7.Q1.A | E4.N7.Q1.C → fournisseur

BEGIN;

CREATE TABLE IF NOT EXISTS usecases_company_status_remediation_20260529 (
  usecase_id uuid PRIMARY KEY,
  previous_company_status text NOT NULL,
  new_company_status text NOT NULL,
  q1_code text NOT NULL,
  q1_source text NOT NULL,
  remediated_at timestamptz NOT NULL DEFAULT NOW()
);

WITH affected AS (
  SELECT u.id AS usecase_id, u.company_status AS previous_company_status
  FROM usecases u
  WHERE u.path_mode = 'short'
    AND u.company_status = 'unknown'
),
resolved AS (
  SELECT
    a.usecase_id,
    a.previous_company_status,
    COALESCE(
      (
        SELECT h.new_value
        FROM usecase_history h
        WHERE h.usecase_id = a.usecase_id
          AND h.event_type = 'field_updated'
          AND h.field_name = 'E4.N7.Q1'
          AND h.new_value IS NOT NULL
          AND btrim(h.new_value) <> ''
          AND h.new_value <> '(vide)'
        ORDER BY h.created_at DESC
        LIMIT 1
      ),
      (
        SELECT ur.single_value
        FROM usecase_responses ur
        WHERE ur.usecase_id = a.usecase_id
          AND ur.question_code = 'E4.N7.Q1'
          AND ur.single_value IS NOT NULL
          AND btrim(ur.single_value) <> ''
        ORDER BY ur.answered_at DESC NULLS LAST, ur.updated_at DESC NULLS LAST
        LIMIT 1
      ),
      (
        SELECT chk.code
        FROM usecases u2
        CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(u2.checklist_gov_usecase, '[]'::jsonb)) AS chk(code)
        WHERE u2.id = a.usecase_id
          AND chk.code ~ '^E4\.N7\.Q1\.[ABC]$'
        LIMIT 1
      )
    ) AS q1_code,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM usecase_history h
        WHERE h.usecase_id = a.usecase_id
          AND h.event_type = 'field_updated'
          AND h.field_name = 'E4.N7.Q1'
          AND h.new_value IS NOT NULL
          AND btrim(h.new_value) <> ''
          AND h.new_value <> '(vide)'
      ) THEN 'usecase_history.new_value'
      WHEN EXISTS (
        SELECT 1
        FROM usecase_responses ur
        WHERE ur.usecase_id = a.usecase_id
          AND ur.question_code = 'E4.N7.Q1'
          AND ur.single_value IS NOT NULL
          AND btrim(ur.single_value) <> ''
      ) THEN 'usecase_responses.single_value'
      WHEN EXISTS (
        SELECT 1
        FROM usecases u2
        CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(u2.checklist_gov_usecase, '[]'::jsonb)) AS chk(code)
        WHERE u2.id = a.usecase_id
          AND chk.code ~ '^E4\.N7\.Q1\.[ABC]$'
      ) THEN 'checklist_gov_usecase'
      ELSE NULL
    END AS q1_source
  FROM affected a
),
mapped AS (
  SELECT
    usecase_id,
    previous_company_status,
    q1_code,
    q1_source,
    CASE
      WHEN q1_code = 'E4.N7.Q1.B' THEN 'utilisateur'
      WHEN q1_code IN ('E4.N7.Q1.A', 'E4.N7.Q1.C') THEN 'fournisseur'
      ELSE NULL
    END AS new_company_status
  FROM resolved
  WHERE q1_code IS NOT NULL
    AND q1_source IS NOT NULL
)
INSERT INTO usecases_company_status_remediation_20260529 (
  usecase_id,
  previous_company_status,
  new_company_status,
  q1_code,
  q1_source
)
SELECT
  m.usecase_id,
  m.previous_company_status,
  m.new_company_status,
  m.q1_code,
  m.q1_source
FROM mapped m
WHERE m.new_company_status IS NOT NULL
ON CONFLICT (usecase_id) DO NOTHING;

UPDATE usecases u
SET
  company_status = b.new_company_status,
  updated_at = NOW()
FROM usecases_company_status_remediation_20260529 b
WHERE u.id = b.usecase_id
  AND u.path_mode = 'short'
  AND u.company_status = 'unknown';

COMMIT;

-- =============================================================================
-- DOWN (référence manuelle — non exécuté par Supabase CLI)
-- =============================================================================
-- Restaure uniquement les lignes touchées par cette remédiation (via table de backup).
--
-- BEGIN;
--
-- UPDATE usecases u
-- SET
--   company_status = b.previous_company_status,
--   updated_at = NOW()
-- FROM usecases_company_status_remediation_20260529 b
-- WHERE u.id = b.usecase_id;
--
-- -- Optionnel : supprimer la table de backup après validation
-- -- DROP TABLE IF EXISTS usecases_company_status_remediation_20260529;
--
-- COMMIT;
--
-- Rollback grossier (déconseillé — peut impacter des parcours courts corrigés après migration) :
--
-- BEGIN;
--
-- UPDATE usecases
-- SET company_status = 'unknown', updated_at = NOW()
-- WHERE path_mode = 'short'
--   AND company_status IN ('utilisateur', 'fournisseur')
--   AND id IN (SELECT usecase_id FROM usecases_company_status_remediation_20260529);
--
-- COMMIT;
