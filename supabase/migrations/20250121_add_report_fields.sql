-- Ajouter les champs pour stocker les rapports d'analyse IA
ALTER TABLE usecases 
ADD COLUMN report_summary TEXT,
ADD COLUMN report_generated_at TIMESTAMPTZ;

-- Index pour les performances sur la recherche de rapports
CREATE INDEX idx_usecases_report_generated_at ON usecases(report_generated_at);

-- Commentaires pour la documentation
COMMENT ON COLUMN usecases.report_summary IS 'Rapport d''analyse de conformité IA Act généré par OpenAI';
COMMENT ON COLUMN usecases.report_generated_at IS 'Date et heure de génération du rapport d''analyse';

