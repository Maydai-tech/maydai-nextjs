-- Alignement enum doc_type : ajout de training_plan (canonique applicatif)
--
-- Contexte :
--   - L'app écrit doc_type = 'training_plan' (lib/canonical-actions.ts, routes /api/dossiers/.../upload)
--   - La base OVH/prod n'exposait que 'training_census' dans l'enum public.doc_type
--   - Symptôme : "Failed to insert document" / invalid input value for enum doc_type: "training_plan"
--
-- UP : ajouter la valeur enum + migrer les lignes existantes training_census → training_plan
--
-- =============================================================================
-- DOWN (référence manuelle — non exécuté par Supabase CLI)
-- =============================================================================
-- Priorité rollback : restaurer les DONNÉES, pas retirer la valeur d'enum.
-- PostgreSQL ne permet pas de DROP une valeur d'enum sans recréer le type :
--   1. Renommer doc_type → doc_type_old
--   2. Créer un nouveau type doc_type sans 'training_plan'
--   3. Re-caster dossier_documents.doc_type
--   4. Supprimer doc_type_old
--
-- Script données (à lancer seul si rollback fonctionnel requis) :
--   UPDATE dossier_documents
--   SET doc_type = 'training_census'
--   WHERE doc_type = 'training_plan';
--
-- =============================================================================
-- UP MIGRATION
-- =============================================================================

-- 1. Ajout de la nouvelle valeur à l'enum
--    (Doit être exécuté en dehors d'un bloc transactionnel strict si erreur,
--     mais standard ici — pas de BEGIN/COMMIT autour de cette instruction.)
ALTER TYPE public.doc_type ADD VALUE IF NOT EXISTS 'training_plan';

-- 2. Migration des anciennes lignes pour préserver la rétrocompatibilité
UPDATE public.dossier_documents
SET doc_type = 'training_plan'
WHERE doc_type = 'training_census';
