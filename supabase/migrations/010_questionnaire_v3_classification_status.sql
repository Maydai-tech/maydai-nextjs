-- Questionnaire long V3 : version 3 + statut de qualification (hors risk_level).

ALTER TABLE usecases DROP CONSTRAINT IF EXISTS usecases_questionnaire_version_check;

ALTER TABLE usecases
  ADD CONSTRAINT usecases_questionnaire_version_check
  CHECK (questionnaire_version IN (1, 2, 3));

ALTER TABLE usecases
  ADD COLUMN IF NOT EXISTS classification_status text
  CHECK (
    classification_status IS NULL
    OR classification_status IN ('qualified', 'impossible')
  );

COMMENT ON COLUMN usecases.questionnaire_version IS '1 = parcours historique, 2 = parcours long V2, 3 = parcours long V3 (qualification séquentielle)';
COMMENT ON COLUMN usecases.classification_status IS 'V3 : qualified = niveau fiable dans risk_level ; impossible = pivots JNS (risk_level NULL)';
