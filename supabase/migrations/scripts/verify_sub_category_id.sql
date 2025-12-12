-- Script de vérification : Vérifier si la colonne sub_category_id existe
-- À exécuter dans Supabase SQL Editor avant la migration

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'sub_category_id';

-- Résultat attendu si la colonne n'existe pas : aucun résultat
-- Résultat attendu si la colonne existe : 
-- column_name      | data_type | is_nullable | column_default
-- sub_category_id  | text      | YES         | NULL
