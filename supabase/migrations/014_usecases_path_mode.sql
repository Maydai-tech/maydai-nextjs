-- Parcours questionnaire persisté pour scoring / API (complète evaluation_path_runs côté UX).
ALTER TABLE usecases
ADD COLUMN IF NOT EXISTS path_mode text;

ALTER TABLE usecases
DROP CONSTRAINT IF EXISTS usecases_path_mode_check;

ALTER TABLE usecases
ADD CONSTRAINT usecases_path_mode_check
CHECK (path_mode IS NULL OR path_mode IN ('short', 'long'));

COMMENT ON COLUMN usecases.path_mode IS 'Parcours V3 : short = pré-diagnostic, long = évaluation complète ; NULL = héritage (inféré requête ou long).';
