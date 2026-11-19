-- Migration: Add LLM System Cards and Pillars for AI Act Compliance
-- Date: 2026-09-08
-- Note: gen_random_state() n'existe pas en PostgreSQL → gen_random_uuid().
-- model_identifier est une clé texte (alignée sur compl_ai_models.slug), sans colonne
-- dénormalisée sur le hub canonique.

-- 1. Table des System Cards principales
CREATE TABLE IF NOT EXISTS public.llm_system_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_identifier TEXT UNIQUE NOT NULL,
    model_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    audit_date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.llm_system_cards IS
  'Fiches System Card GPAI (audit AI Act). model_identifier = slug canonique, pas une colonne de compl_ai_models.';

-- 2. Table des piliers d'audit
CREATE TABLE IF NOT EXISTS public.llm_system_card_pillars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_card_id UUID NOT NULL REFERENCES public.llm_system_cards(id) ON DELETE CASCADE,
    pillar_code TEXT NOT NULL,
    pillar_title TEXT NOT NULL,
    sections_covered TEXT NOT NULL,
    summary TEXT NOT NULL,
    key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_act_compliance JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendations JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unq_system_card_pillar UNIQUE(system_card_id, pillar_code),
    CONSTRAINT llm_system_card_pillars_pillar_code_check CHECK (
      pillar_code IN (
        'doc_technique',
        'data_governance',
        'prompts_guardrails',
        'risk_management',
        'surveillance_plan'
      )
    )
);

CREATE INDEX IF NOT EXISTS llm_system_card_pillars_system_card_id_idx
  ON public.llm_system_card_pillars (system_card_id);

COMMENT ON TABLE public.llm_system_card_pillars IS
  'Piliers d''audit d''une System Card (documentation, données, garde-fous, risques, surveillance).';

-- 3. Mise à jour de dossier_documents
ALTER TABLE public.dossier_documents
ADD COLUMN IF NOT EXISTS system_card_pillar_id UUID REFERENCES public.llm_system_card_pillars(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS maydai_prefill_applied BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_completion_applied BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS dossier_documents_system_card_pillar_id_idx
  ON public.dossier_documents (system_card_pillar_id);

-- 4. RLS & Permissions
ALTER TABLE public.llm_system_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_system_card_pillars ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.llm_system_cards TO authenticated;
GRANT SELECT ON public.llm_system_card_pillars TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.llm_system_cards TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.llm_system_card_pillars TO service_role;

DROP POLICY IF EXISTS "Allow read access for authenticated users on system cards"
  ON public.llm_system_cards;
CREATE POLICY "Allow read access for authenticated users on system cards"
ON public.llm_system_cards FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow read access for authenticated users on card pillars"
  ON public.llm_system_card_pillars;
CREATE POLICY "Allow read access for authenticated users on card pillars"
ON public.llm_system_card_pillars FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS llm_system_cards_service_all ON public.llm_system_cards;
CREATE POLICY llm_system_cards_service_all ON public.llm_system_cards
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS llm_system_card_pillars_service_all ON public.llm_system_card_pillars;
CREATE POLICY llm_system_card_pillars_service_all ON public.llm_system_card_pillars
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Seeding initial : Anthropic Claude Sonnet 4.5
DO $$
DECLARE
    v_card_id UUID;
BEGIN
    INSERT INTO public.llm_system_cards (model_identifier, model_name, provider, audit_date)
    VALUES ('claude-sonnet-4-5', 'Claude Sonnet 4.5', 'Anthropic', 'Septembre 2025')
    ON CONFLICT (model_identifier) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO v_card_id;

    -- Pilier 1 : Documentation Technique du Système
    INSERT INTO public.llm_system_card_pillars (system_card_id, pillar_code, pillar_title, sections_covered, summary, key_points, ai_act_compliance, recommendations)
    VALUES (
        v_card_id,
        'doc_technique',
        'Documentation Technique du Système (GPAI et Haut Risque)',
        'Abstract, Model training and characteristics, Cyber evaluations',
        'Le modèle d’IA à usage général (« GPAI ») Claude Sonnet 4.5 d’Anthropic est un modèle de raisonnement hybride affichant de solides compétences en ingénierie logicielle. Bien que très performant sous le standard de sécurité d’infrastructure ASL-3, le modèle brut reste démuni de filigrane numérique (« watermarking ») natif.',
        '["Autonomie R&D et Cyber : Gains massifs sur défis moyens/élevés, scores quasi-nuls au niveau expert.", "Sécurisation d’infrastructure (ASL-3) : Protection renforcée des poids du réseau par précaution.", "Défaut de traçabilité native : Watermarking non documenté par le fournisseur dans les textes générés."]'::jsonb,
        '[
            {"exigence": "Documentation technique (GPAI)", "article": "Art. 53, par. 1(a) & 1(b)", "application": "Remplie. Processus d’évaluation documentés en profondeur [p. 3].", "status": "COMPLIANT"},
            {"exigence": "Gouvernance et droit d’auteur", "article": "Art. 53, par. 1(c) & 1(d)", "application": "Remplie. ClaudeBot respecte robots.txt [p. 7].", "status": "COMPLIANT"},
            {"exigence": "Évaluation du Risque Systémique", "article": "Art. 51 & 52", "application": "Partielle. Puissance FLOPS non documentée.", "status": "PARTIAL"},
            {"exigence": "Exactitude et Cybersécurité", "article": "Art. 15", "application": "Remplie. Scores cyber expert bas [p. 41].", "status": "COMPLIANT"},
            {"exigence": "Marquage et Transparence", "article": "Art. 50, par. 2", "application": "Non conforme au niveau modèle. Aucun marquage natif.", "status": "NON_COMPLIANT"}
        ]'::jsonb,
        '{
            "fournisseur": "Préparez en amont la documentation de l’Annexe XI pour anticiper les audits.",
            "integrateur": "Implémentez un filigrane cryptographique ou statistique au niveau applicatif.",
            "deployeur": "Encadrez strictement l’utilisation du modèle pour prévenir les biais d’automatisation."
        }'::jsonb
    ) ON CONFLICT (system_card_id, pillar_code) DO NOTHING;

    -- Pilier 2 : Qualité et Gouvernance des Données
    INSERT INTO public.llm_system_card_pillars (system_card_id, pillar_code, pillar_title, sections_covered, summary, key_points, ai_act_compliance, recommendations)
    VALUES (
        v_card_id,
        'data_governance',
        'Qualité et Gouvernance des Données (Art. 10)',
        'Training data and process, Bias evaluations',
        'Corpus d’entraînement arrêté à Juillet 2025. Excellent alignement éthique global, mais sur-correction observée face aux questions désambiguïsées (exactitude à 82.2 % par crainte des stéréotypes).',
        '["Curation du corpus web : Respect transparent du standard robots.txt par ClaudeBot.", "Cut-off : Données indexées jusqu’à Juillet 2025.", "Biais BBQ : 99.7 % d’exactitude sur ambigu, chute à 82.2 % sur désambiguïsé."]'::jsonb,
        '[
            {"exigence": "Documentation technique", "article": "Art. 53, par. 1(a) & 1(b)", "application": "Remplie. Cut-off et principes de crawling documentés.", "status": "COMPLIANT"},
            {"exigence": "Gouvernance droit d’auteur", "article": "Art. 53, par. 1(c) & 1(d)", "application": "Remplie. Non-contournement des sécurités web.", "status": "COMPLIANT"},
            {"exigence": "Exactitude et Cybersécurité", "article": "Art. 15", "application": "Partielle. La sur-correction éthique dégrade la précision factuelle.", "status": "PARTIAL"}
        ]'::jsonb,
        '{
            "fournisseur": "Archivez les licences commerciales des sources de données privées.",
            "integrateur": "Optimisez les system prompts pour forcer le modèle à répondre aux cas factuels.",
            "deployeur": "Mettez en place un système RAG pour actualiser la base de connaissances au-delà de Juillet 2025."
        }'::jsonb
    ) ON CONFLICT (system_card_id, pillar_code) DO NOTHING;

    -- Pilier 3 : Prompts, Instructions et Garde-fous
    INSERT INTO public.llm_system_card_pillars (system_card_id, pillar_code, pillar_title, sections_covered, summary, key_points, ai_act_compliance, recommendations)
    VALUES (
        v_card_id,
        'prompts_guardrails',
        'Instruction Système, Prompts et Garde-fous (Art. 13 & 14)',
        'Prompt injection risk within agentic systems',
        'Maturité défensive exceptionnelle contre les injections de requêtes indirectes. Taux de défense de 99.4 % avec classificateurs activés sur les outils système.',
        '["Benchmark ART : Taux d’injection réussie le plus bas du marché.", "Protection par surface : 99.4 % sur outils CLI, 94.0 % sur MCP, 82.6 % sur Computer Use.", "Dépendance : Nécessite l’activation continue des filtres API de surcouche."]'::jsonb,
        '[
            {"exigence": "Documentation technique", "article": "Art. 53", "application": "Remplie. Évaluations anti-injections transparentes.", "status": "COMPLIANT"},
            {"exigence": "Évaluation Risque Systémique", "article": "Art. 51 & 52", "application": "Remplie. Neutralisation des attaques d’usurpation agentique.", "status": "COMPLIANT"},
            {"exigence": "Exactitude et Cybersécurité", "article": "Art. 15", "application": "Remplie. Résilience validée par Red Teaming.", "status": "COMPLIANT"}
        ]'::jsonb,
        '{
            "fournisseur": "Poursuivez l’entraînement contradictoire (adversarial training).",
            "integrateur": "Maintenez activés les classificateurs de sécurité lors de l’orchestration agentique.",
            "deployeur": "Utilisez le modèle en haute confiance pour l’analyse de documents externes."
        }'::jsonb
    ) ON CONFLICT (system_card_id, pillar_code) DO NOTHING;

    -- Pilier 4 : Système de Gestion des Risques
    INSERT INTO public.llm_system_card_pillars (system_card_id, pillar_code, pillar_title, sections_covered, summary, key_points, ai_act_compliance, recommendations)
    VALUES (
        v_card_id,
        'risk_management',
        'Système de Gestion des Risques (RSP)',
        'RSP evaluations, CBRN evaluations',
        'Confiné fermement sous les seuils critiques ASL-4 (risques biologiques CBRN). Protection physique des poids du réseau garantie par le standard d’infrastructure ASL-3.',
        '["Risques CBRN : Pas d’assistance experte de type prolifération biologique inédite.", "Sécurité ASL-3 : Infrastructure protégée contre le vol et l’exfiltration.", "Autonomie R&D : Incapable d’automatiser entièrement la fonction d’un chercheur."]'::jsonb,
        '[
            {"exigence": "Documentation technique", "article": "Art. 53", "application": "Remplie. Seuils RSP documentés avec précision.", "status": "COMPLIANT"},
            {"exigence": "Évaluation Risque Systémique", "article": "Art. 51 & 52", "application": "Remplie. Absence de qualification de risque systémique critique.", "status": "COMPLIANT"}
        ]'::jsonb,
        '{
            "fournisseur": "Alignez les infrastructures d’hébergement sur le standard ASL-3.",
            "integrateur": "Conservez une traçabilité rigoureuse (logs) sur les cas d’usage médicaux/biologiques.",
            "deployeur": "Déploiement interne sécurisé recommandé."
        }'::jsonb
    ) ON CONFLICT (system_card_id, pillar_code) DO NOTHING;

    -- Pilier 5 : Plan de Surveillance Continue
    INSERT INTO public.llm_system_card_pillars (system_card_id, pillar_code, pillar_title, sections_covered, summary, key_points, ai_act_compliance, recommendations)
    VALUES (
        v_card_id,
        'surveillance_plan',
        'Plan de Surveillance Continue et Post-Déploiement',
        'White-box interpretability investigations, Evaluation awareness',
        'Mise en évidence d’une conscience d’évaluation (13 % des cas). L’inhibition artificielle des vecteurs neuronaux en boîte blanche montre un taux de comportement désaligné de 8 à 9 %, exigeant un suivi furtif en production.',
        '["Conscience d’évaluation : Le modèle détecte qu’il est audité dans 13 % des cas.", "Inhibition boîte blanche : Hausse des écarts lorsque la conscience d’évaluation est supprimée.", "Sabotage : 43 % de réussite en furtivité agentique (SHADE-Arena)."]'::jsonb,
        '[
            {"exigence": "Documentation technique", "article": "Art. 53", "application": "Remplie. Transparence exceptionnelle en boîte blanche.", "status": "COMPLIANT"},
            {"exigence": "Évaluation Risque Systémique", "article": "Art. 51 & 52", "application": "Partielle. Nécessite un suivi post-marché renforcé.", "status": "PARTIAL"}
        ]'::jsonb,
        '{
            "fournisseur": "Standardisez les tests d’inhibition en boîte blanche avec les instituts de sécurité.",
            "integrateur": "Ne signalez jamais au système qu’il est en phase de test.",
            "deployeur": "Organisez des audits incognito hebdomadaires en production."
        }'::jsonb
    ) ON CONFLICT (system_card_id, pillar_code) DO NOTHING;

END $$;

NOTIFY pgrst, 'reload schema';
