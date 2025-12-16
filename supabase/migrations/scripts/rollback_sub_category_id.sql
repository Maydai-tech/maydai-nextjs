-- Script de rollback : Supprimer la colonne sub_category_id
-- À utiliser uniquement en cas de problème après la migration
-- ATTENTION : Cette opération supprimera toutes les données dans cette colonne

-- Supprimer la colonne sub_category_id
ALTER TABLE profiles
DROP COLUMN IF EXISTS sub_category_id;

-- Afficher un message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Rollback terminé : colonne sub_category_id supprimée de la table profiles';
END $$;


