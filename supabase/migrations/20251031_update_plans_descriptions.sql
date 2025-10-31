-- Migration: Mise à jour des descriptions et valeurs de stockage des plans
-- Date: 2025-10-31
-- Description: Met à jour les descriptions des plans et définit les limites de stockage

-- Mise à jour du plan Freemium
UPDATE plans
SET 
  description = 'Idéal pour découvrir la plateforme et initier votre démarche de conformité sur un projet test.',
  max_storage_mb = 250
WHERE plan_id = 'freemium';

-- Mise à jour du plan Starter
UPDATE plans
SET 
  description = 'Parfait pour les petites équipes et les startups qui structurent leur IA responsable.',
  max_storage_mb = 1024
WHERE plan_id = 'starter';

-- Mise à jour du plan Pro
UPDATE plans
SET 
  description = 'Pour les équipes en croissance qui pilotent activement leur conformité IA.',
  max_storage_mb = 5120
WHERE plan_id = 'pro';

-- Mise à jour du plan Enterprise
UPDATE plans
SET 
  description = 'Conçu pour les grandes organisations qui déploient et auditent l''IA à grande échelle.',
  max_storage_mb = 51200
WHERE plan_id = 'enterprise';

-- Mise à jour du plan Corporate (si existe)
UPDATE plans
SET 
  description = 'Conçu pour les grandes organisations qui déploient et auditent l''IA à grande échelle.',
  max_storage_mb = 51200
WHERE plan_id = 'corporate';

