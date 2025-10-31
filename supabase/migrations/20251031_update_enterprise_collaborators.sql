-- Migration: Mise à jour du nombre de collaborateurs pour Enterprise
-- Date: 2025-10-31
-- Description: Passe le plan Enterprise à 50 collaborateurs

-- Mise à jour du plan Enterprise
UPDATE plans
SET max_collaborators = 50
WHERE plan_id = 'enterprise';

-- Mise à jour du plan Corporate (si existe)
UPDATE plans
SET max_collaborators = 50
WHERE plan_id = 'corporate';

