-- Runs d’évaluation parcours court / long (first-party) — temps de complétion, entrées, résultats.
-- Pas de logique métier AI Act : horodatages et champs d’agrégation uniquement.

CREATE TABLE IF NOT EXISTS evaluation_path_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usecase_id uuid NOT NULL REFERENCES usecases (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  questionnaire_version smallint NOT NULL CHECK (questionnaire_version IN (1, 2, 3)),
  path_mode text NOT NULL CHECK (path_mode IN ('short', 'long')),
  entry_surface text,
  system_type text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  completion_seconds integer,
  classification_status text,
  risk_level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE evaluation_path_runs IS 'Parcours questionnaire court/long : démarrage, fin, durée, résultat (first-party).';
COMMENT ON COLUMN evaluation_path_runs.path_mode IS 'short = parcours court V3 ; long = évaluation complète.';
COMMENT ON COLUMN evaluation_path_runs.entry_surface IS 'Valeur du paramètre URL entree si présente.';
COMMENT ON COLUMN evaluation_path_runs.completion_seconds IS 'Secondes entre started_at et completed_at.';

CREATE UNIQUE INDEX IF NOT EXISTS evaluation_path_runs_one_open_per_usecase_path
  ON evaluation_path_runs (usecase_id, path_mode)
  WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS evaluation_path_runs_company_started
  ON evaluation_path_runs (company_id, started_at DESC);

CREATE INDEX IF NOT EXISTS evaluation_path_runs_path_completed
  ON evaluation_path_runs (path_mode, completed_at DESC)
  WHERE completed_at IS NOT NULL;

ALTER TABLE evaluation_path_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evaluation_path_runs_select_company"
  ON evaluation_path_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = evaluation_path_runs.company_id
    )
  );

CREATE POLICY "evaluation_path_runs_insert_company"
  ON evaluation_path_runs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = evaluation_path_runs.company_id
    )
  );

CREATE POLICY "evaluation_path_runs_update_company"
  ON evaluation_path_runs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = evaluation_path_runs.company_id
    )
  );
