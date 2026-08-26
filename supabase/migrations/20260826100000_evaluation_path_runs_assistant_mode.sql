-- Ajoute le parcours conversationnel Chat IA aux runs first-party (court / long / assistant).

ALTER TABLE evaluation_path_runs
  DROP CONSTRAINT IF EXISTS evaluation_path_runs_path_mode_check;

ALTER TABLE evaluation_path_runs
  ADD CONSTRAINT evaluation_path_runs_path_mode_check
  CHECK (path_mode IN ('short', 'long', 'assistant'));

COMMENT ON COLUMN evaluation_path_runs.path_mode IS
  'short = parcours court V3 ; long = questionnaire complet ; assistant = évaluation conversationnelle Chat IA.';

COMMENT ON TABLE evaluation_path_runs IS
  'Parcours questionnaire court/long et assistant Chat IA : démarrage, fin, durée, résultat (first-party).';
