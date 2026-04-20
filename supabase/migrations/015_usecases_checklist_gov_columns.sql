-- Checklists gouvernance (BPGV / transparence) persistées sur `usecases`.
-- Utilisées par l’API score, calculate-score, responses, rapports LLM, etc.

ALTER TABLE public.usecases
  ADD COLUMN IF NOT EXISTS checklist_gov_enterprise jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.usecases
  ADD COLUMN IF NOT EXISTS checklist_gov_usecase jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.usecases.checklist_gov_enterprise IS
  'Codes d’options checklist gouvernance au niveau entreprise (parcours questionnaire).';

COMMENT ON COLUMN public.usecases.checklist_gov_usecase IS
  'Codes d’options checklist gouvernance au niveau cas d’usage (transparence, etc.).';
