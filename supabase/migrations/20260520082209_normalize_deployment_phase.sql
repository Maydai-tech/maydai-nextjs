-- Normalise usecases.deployment_phase vers des clés techniques alignées avec le schéma Zod.
--
-- Source applicative :
--   - lib/validations/usecase.ts : défaut explicite `en_projet` (deploymentPhaseCreateSchema)
--   - lib/deployment-status.ts : 3 libellés UI français (à mapper vers clés snake_case)
--
-- Clés techniques cible :
--   en_projet      ← "En projet (Non déployé)" / défaut Zod
--   en_production  ← "En production"
--   en_test        ← "En phase de test / Expérimentation"

-- =============================================================================
-- UP
-- =============================================================================

BEGIN;

CREATE TYPE public.deployment_phase_enum AS ENUM (
  'en_projet',
  'en_production',
  'en_test'
);

-- Normalisation des valeurs texte existantes avant cast enum
UPDATE public.usecases
SET deployment_phase = CASE
  -- Libellés français (UI / payloads historiques)
  WHEN trim(deployment_phase) = 'En production' THEN 'en_production'
  WHEN trim(deployment_phase) = 'En phase de test / Expérimentation' THEN 'en_test'
  WHEN trim(deployment_phase) = 'En projet (Non déployé)' THEN 'en_projet'
  -- Clés techniques déjà conformes
  WHEN trim(deployment_phase) = 'en_production' THEN 'en_production'
  WHEN trim(deployment_phase) = 'en_test' THEN 'en_test'
  WHEN trim(deployment_phase) = 'en_projet' THEN 'en_projet'
  -- Variantes courantes / legacy
  WHEN trim(deployment_phase) ILIKE 'en production%' THEN 'en_production'
  WHEN trim(deployment_phase) ILIKE 'en phase de test%' THEN 'en_test'
  WHEN trim(deployment_phase) ILIKE 'en projet%' THEN 'en_projet'
  WHEN trim(deployment_phase) = '' OR deployment_phase IS NULL THEN 'en_projet'
  -- Fallback aligné sur le défaut Zod (deploymentPhaseCreateSchema)
  ELSE 'en_projet'
END;

ALTER TABLE public.usecases
  ALTER COLUMN deployment_phase TYPE public.deployment_phase_enum
  USING deployment_phase::public.deployment_phase_enum;

COMMENT ON COLUMN public.usecases.deployment_phase IS
  'Phase de déploiement (clés techniques) : en_projet | en_production | en_test';

COMMIT;

-- =============================================================================
-- DOWN
-- =============================================================================

-- BEGIN;

-- ALTER TABLE public.usecases
--   ALTER COLUMN deployment_phase TYPE text
--   USING deployment_phase::text;

-- DROP TYPE IF EXISTS public.deployment_phase_enum;

-- COMMIT;
