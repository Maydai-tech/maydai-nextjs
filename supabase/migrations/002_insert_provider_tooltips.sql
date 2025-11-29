-- Migration: Insert tooltip data for all AI providers
-- Description: Populate tooltip information for existing and new providers
-- Date: 2025-01-XX

-- Note: This migration uses UPSERT to avoid duplicates
-- The provider names must match exactly the names in the model_providers table

-- 1. Anthropic - Mise à jour
UPDATE model_providers
SET 
  tooltip_title = 'Anthropic',
  tooltip_short_content = 'Le nouveau leader du marché "Entreprise" (B2B) avec Claude, plébiscité pour le code.',
  tooltip_full_content = 'Fondée par des anciens d''OpenAI, Anthropic a dépassé ses concurrents en entreprise avec 32% de parts d''utilisation. Leurs modèles (Claude 3.5/3.7) sont considérés comme les plus performants pour le développement (coding). Ils privilégient la sécurité via l''IA Constitutionnelle.',
  tooltip_icon = '🧠',
  tooltip_rank = 1,
  tooltip_rank_text = '#1 Entreprise 🥇 / #3 Global'
WHERE LOWER(name) = LOWER('Anthropic');

-- 2. Google - Mise à jour
UPDATE model_providers
SET 
  tooltip_title = 'Google',
  tooltip_short_content = 'Le challenger n°1 global avec Gemini, profondément intégré à l''écosystème Android et Workspace.',
  tooltip_full_content = 'Google détient environ 20% du marché entreprise et 40% de l''usage grand public aux USA. Avec Gemini (Pro/Flash/Ultra), Google mise sur la multimodalité native et une fenêtre de contexte immense, s''imposant comme le principal rival d''OpenAI.',
  tooltip_icon = '🔍',
  tooltip_rank = 2,
  tooltip_rank_text = '#2 Global 🥈'
WHERE LOWER(name) = LOWER('Google');

-- 3. OpenAI - Mise à jour
UPDATE model_providers
SET 
  tooltip_title = 'OpenAI',
  tooltip_short_content = 'Le pionnier et leader incontesté du grand public avec ChatGPT et la série GPT-4/o1.',
  tooltip_full_content = 'Créateur de ChatGPT, OpenAI conserve 69% de l''usage grand public. Bien qu''il soit passé n°2 en entreprise (25%) derrière Anthropic, il reste la référence mondiale en notoriété et revenus, soutenu par ses modèles de raisonnement "o1" et son partenariat avec Microsoft.',
  tooltip_icon = '🤖',
  tooltip_rank = 1,
  tooltip_rank_text = '#1 Grand Public 🥇 / #2 Entreprise'
WHERE LOWER(name) = LOWER('OpenAI');

-- 4. Meta - Mise à jour
UPDATE model_providers
SET 
  tooltip_title = 'Meta',
  tooltip_short_content = 'Le champion du standard "Open Weight" avec la famille Llama.',
  tooltip_full_content = 'Avec Llama 3, Meta reste la référence pour les modèles ouverts, bien que sa part d''usage direct en entreprise soit plus faible (9%). Ils définissent le standard que les développeurs utilisent pour créer leurs propres applications, malgré la montée des concurrents chinois.',
  tooltip_icon = '👥',
  tooltip_rank = NULL,
  tooltip_rank_text = '#1 Open Source 🔓'
WHERE LOWER(name) = LOWER('Meta');

-- 5. Mistral - Mise à jour
UPDATE model_providers
SET 
  tooltip_title = 'Mistral',
  tooltip_short_content = 'La licorne française, championne de l''efficience et de la souveraineté européenne.',
  tooltip_full_content = 'Classé dans le Top 3 des modèles ouverts, Mistral (Large/Mixtral) est l''alternative européenne privilégiée pour les entreprises soucieuses de la localité des données. Ils se distinguent par des modèles très performants par rapport à leur taille (efficience).',
  tooltip_icon = '🇫🇷',
  tooltip_rank = NULL,
  tooltip_rank_text = 'Leader Européen 🇪🇺'
WHERE LOWER(name) = LOWER('Mistral') OR LOWER(name) = LOWER('Mistral AI');

-- 6. Qwen - Mise à jour
UPDATE model_providers
SET 
  tooltip_title = 'Qwen (Alibaba)',
  tooltip_short_content = 'Le géant technologique chinois qui rivalise avec les meilleurs modèles US.',
  tooltip_full_content = 'Développé par Alibaba, Qwen (2.5/Max) est considéré comme le leader technique en Chine et surpasse souvent Llama dans les benchmarks. Il représente une part croissante des téléchargements open-source mondiaux.',
  tooltip_icon = '☁️',
  tooltip_rank = NULL,
  tooltip_rank_text = 'Leader Asie 🌏'
WHERE LOWER(name) = LOWER('Qwen') OR LOWER(name) = LOWER('Alibaba');

-- 7. Microsoft - Nouveau fournisseur (INSERT seulement si n'existe pas)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM model_providers WHERE LOWER(name) = LOWER('Microsoft')) THEN
    INSERT INTO model_providers (name, tooltip_title, tooltip_short_content, tooltip_full_content, tooltip_icon, tooltip_rank, tooltip_rank_text)
    VALUES (
      'Microsoft',
      'Microsoft',
      'Le leader des plateformes IA pour les pros avec Copilot et Azure.',
      'Microsoft domine le marché des infrastructures (39% de part de marché plateforme) via Azure AI et Copilot. Bien qu''ils utilisent principalement les modèles d''OpenAI, ils développent également leurs propres petits modèles efficaces (famille Phi).',
      '☁️',
      NULL,
      '#1 Plateforme Cloud ☁️'
    );
  ELSE
    UPDATE model_providers
    SET 
      tooltip_title = 'Microsoft',
      tooltip_short_content = 'Le leader des plateformes IA pour les pros avec Copilot et Azure.',
      tooltip_full_content = 'Microsoft domine le marché des infrastructures (39% de part de marché plateforme) via Azure AI et Copilot. Bien qu''ils utilisent principalement les modèles d''OpenAI, ils développent également leurs propres petits modèles efficaces (famille Phi).',
      tooltip_icon = '☁️',
      tooltip_rank = NULL,
      tooltip_rank_text = '#1 Plateforme Cloud ☁️'
    WHERE LOWER(name) = LOWER('Microsoft');
  END IF;
END $$;

-- 8. xAI - Nouveau fournisseur
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM model_providers WHERE LOWER(name) = LOWER('xAI')) THEN
    INSERT INTO model_providers (name, tooltip_title, tooltip_short_content, tooltip_full_content, tooltip_icon, tooltip_rank, tooltip_rank_text)
    VALUES (
      'xAI',
      'xAI',
      'L''IA d''Elon Musk intégrée à X (Twitter), misant sur l''accès aux données temps réel.',
      'Avec son modèle Grok, xAI se distingue par l''accès direct au flux de données du réseau social X. Positionné comme une alternative "moins censurée" et forte en raisonnement, il reste un acteur de niche mais très visible médiatiquement.',
      '⚡️',
      NULL,
      'Challenger Temps Réel ⚡️'
    );
  ELSE
    UPDATE model_providers
    SET 
      tooltip_title = 'xAI',
      tooltip_short_content = 'L''IA d''Elon Musk intégrée à X (Twitter), misant sur l''accès aux données temps réel.',
      tooltip_full_content = 'Avec son modèle Grok, xAI se distingue par l''accès direct au flux de données du réseau social X. Positionné comme une alternative "moins censurée" et forte en raisonnement, il reste un acteur de niche mais très visible médiatiquement.',
      tooltip_icon = '⚡️',
      tooltip_rank = NULL,
      tooltip_rank_text = 'Challenger Temps Réel ⚡️'
    WHERE LOWER(name) = LOWER('xAI');
  END IF;
END $$;

-- 9. Perplexity - Nouveau fournisseur
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM model_providers WHERE LOWER(name) = LOWER('Perplexity')) THEN
    INSERT INTO model_providers (name, tooltip_title, tooltip_short_content, tooltip_full_content, tooltip_icon, tooltip_rank, tooltip_rank_text)
    VALUES (
      'Perplexity',
      'Perplexity',
      'Le moteur de réponse conversationnel qui défie Google Search.',
      'Plus qu''un fournisseur de modèle, Perplexity est une interface qui agrège plusieurs IA (OpenAI, Claude, Llama) pour la recherche web. Avec une croissance rapide (22-30M utilisateurs), il s''impose comme l''outil de référence pour la "recherche conversationnelle".',
      '🔎',
      NULL,
      'Challenger Recherche 🔎'
    );
  ELSE
    UPDATE model_providers
    SET 
      tooltip_title = 'Perplexity',
      tooltip_short_content = 'Le moteur de réponse conversationnel qui défie Google Search.',
      tooltip_full_content = 'Plus qu''un fournisseur de modèle, Perplexity est une interface qui agrège plusieurs IA (OpenAI, Claude, Llama) pour la recherche web. Avec une croissance rapide (22-30M utilisateurs), il s''impose comme l''outil de référence pour la "recherche conversationnelle".',
      tooltip_icon = '🔎',
      tooltip_rank = NULL,
      tooltip_rank_text = 'Challenger Recherche 🔎'
    WHERE LOWER(name) = LOWER('Perplexity');
  END IF;
END $$;

-- 10. DeepSeek - Nouveau fournisseur
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM model_providers WHERE LOWER(name) = LOWER('DeepSeek')) THEN
    INSERT INTO model_providers (name, tooltip_title, tooltip_short_content, tooltip_full_content, tooltip_icon, tooltip_rank, tooltip_rank_text)
    VALUES (
      'DeepSeek',
      'DeepSeek',
      'Le "disrupteur" chinois qui casse les prix avec des performances de premier plan.',
      'Révélation 2024/2025, DeepSeek (modèles V3/R1) offre des performances rivalisant avec GPT-4 pour une fraction du coût. Très populaire auprès des développeurs pour son efficience en mathématiques et code, il remet en cause le modèle économique des géants américains.',
      '🚀',
      NULL,
      'Challenger / Disrupteur 🚀'
    );
  ELSE
    UPDATE model_providers
    SET 
      tooltip_title = 'DeepSeek',
      tooltip_short_content = 'Le "disrupteur" chinois qui casse les prix avec des performances de premier plan.',
      tooltip_full_content = 'Révélation 2024/2025, DeepSeek (modèles V3/R1) offre des performances rivalisant avec GPT-4 pour une fraction du coût. Très populaire auprès des développeurs pour son efficience en mathématiques et code, il remet en cause le modèle économique des géants américains.',
      tooltip_icon = '🚀',
      tooltip_rank = NULL,
      tooltip_rank_text = 'Challenger / Disrupteur 🚀'
    WHERE LOWER(name) = LOWER('DeepSeek');
  END IF;
END $$;
