-- Ajouter la relation Foreign Key entre usecases et compl_ai_models
ALTER TABLE usecases 
ADD COLUMN primary_model_id UUID REFERENCES compl_ai_models(id) ON DELETE SET NULL;

-- Index pour les performances
CREATE INDEX idx_usecases_primary_model_id ON usecases(primary_model_id);

-- Commentaire pour la documentation
COMMENT ON COLUMN usecases.primary_model_id IS 'Référence vers le modèle COMPL-AI principal utilisé pour ce cas d''usage';
