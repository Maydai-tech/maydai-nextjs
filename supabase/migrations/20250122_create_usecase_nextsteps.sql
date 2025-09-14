-- Créer la table usecase_nextsteps pour stocker les rapports OpenAI structurés
CREATE TABLE usecase_nextsteps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usecase_id UUID NOT NULL REFERENCES usecases(id) ON DELETE CASCADE,
  
  -- Sections fixes (toujours présentes)
  introduction TEXT,
  evaluation TEXT,
  impact TEXT,
  conclusion TEXT,
  
  -- Les 3 priorités d'actions réglementaires
  priorite_1 TEXT,
  priorite_2 TEXT,
  priorite_3 TEXT,
  
  -- Quick wins & actions immédiates
  quick_win_1 TEXT,
  quick_win_2 TEXT,
  quick_win_3 TEXT,
  
  -- Actions à moyen terme
  action_1 TEXT,
  action_2 TEXT,
  action_3 TEXT,
  
  -- Métadonnées
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version VARCHAR(50),
  processing_time_ms INTEGER,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX idx_usecase_nextsteps_usecase_id ON usecase_nextsteps(usecase_id);
CREATE INDEX idx_usecase_nextsteps_generated_at ON usecase_nextsteps(generated_at);

-- Contrainte d'unicité (un rapport par use case)
CREATE UNIQUE INDEX idx_usecase_nextsteps_usecase_unique ON usecase_nextsteps(usecase_id);

-- Commentaires pour la documentation
COMMENT ON TABLE usecase_nextsteps IS 'Rapports d''analyse OpenAI structurés avec sections extraites';
COMMENT ON COLUMN usecase_nextsteps.introduction IS 'Introduction contextuelle du rapport';
COMMENT ON COLUMN usecase_nextsteps.evaluation IS 'Évaluation du niveau de risque AI Act';
COMMENT ON COLUMN usecase_nextsteps.impact IS 'Impact attendu des actions';
COMMENT ON COLUMN usecase_nextsteps.conclusion IS 'Conclusion du rapport';
COMMENT ON COLUMN usecase_nextsteps.priorite_1 IS 'Première priorité d''action réglementaire';
COMMENT ON COLUMN usecase_nextsteps.priorite_2 IS 'Deuxième priorité d''action réglementaire';
COMMENT ON COLUMN usecase_nextsteps.priorite_3 IS 'Troisième priorité d''action réglementaire';
COMMENT ON COLUMN usecase_nextsteps.quick_win_1 IS 'Premier quick win recommandé';
COMMENT ON COLUMN usecase_nextsteps.quick_win_2 IS 'Deuxième quick win recommandé';
COMMENT ON COLUMN usecase_nextsteps.quick_win_3 IS 'Troisième quick win recommandé';
COMMENT ON COLUMN usecase_nextsteps.action_1 IS 'Première action à moyen terme';
COMMENT ON COLUMN usecase_nextsteps.action_2 IS 'Deuxième action à moyen terme';
COMMENT ON COLUMN usecase_nextsteps.action_3 IS 'Troisième action à moyen terme';

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_usecase_nextsteps_updated_at 
    BEFORE UPDATE ON usecase_nextsteps 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
