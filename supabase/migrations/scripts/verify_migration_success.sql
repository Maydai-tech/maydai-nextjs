-- Script de vérification : Vérifier que la migration a réussi
-- À exécuter dans Supabase SQL Editor après la migration

-- 1. Vérifier que la colonne existe
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'sub_category_id';

-- 2. Vérifier la structure complète de la table profiles (pour référence)
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Vérifier les données existantes (les profils existants auront sub_category_id = NULL)
SELECT 
    COUNT(*) as total_profiles,
    COUNT(sub_category_id) as profiles_with_sub_category,
    COUNT(*) - COUNT(sub_category_id) as profiles_without_sub_category
FROM profiles;

