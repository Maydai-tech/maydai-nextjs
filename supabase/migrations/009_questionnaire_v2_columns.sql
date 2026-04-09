-- Questionnaire long V2 : métadonnées sur les cas d'usage (V1 inchangé côté défauts).
-- Les lignes existantes restent questionnaire_version = 1.

ALTER TABLE usecases
  ADD COLUMN IF NOT EXISTS questionnaire_version smallint NOT NULL DEFAULT 1
    CHECK (questionnaire_version IN (1, 2));

ALTER TABLE usecases
  ADD COLUMN IF NOT EXISTS bpgv_variant text
    CHECK (
      bpgv_variant IS NULL
      OR bpgv_variant IN ('minimal', 'limited', 'high', 'unacceptable')
    );

ALTER TABLE usecases
  ADD COLUMN IF NOT EXISTS active_question_codes jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE usecases
  ADD COLUMN IF NOT EXISTS ors_exit text
    CHECK (ors_exit IS NULL OR ors_exit IN ('unacceptable', 'n8_completed'));

COMMENT ON COLUMN usecases.questionnaire_version IS '1 = parcours historique, 2 = parcours long V2 (ORS puis BPGV)';
COMMENT ON COLUMN usecases.bpgv_variant IS 'V2 : variante du bloc BPGV une fois l''ORS terminé';
COMMENT ON COLUMN usecases.active_question_codes IS 'V2 : liste JSON des codes de questions actives sur le chemin courant';
COMMENT ON COLUMN usecases.ors_exit IS 'V2 : sortie ORS (sortie rapide N7 vs fin N8)';

CREATE INDEX IF NOT EXISTS idx_usecases_questionnaire_version
  ON usecases (questionnaire_version);
