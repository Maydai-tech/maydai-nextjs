-- Migration: Supprimer les tables de rôles inutilisées
-- Date: 2025-07-06
-- Description: Supprime les tables roles et users_roles maintenant que nous utilisons la colonne role dans profiles

-- 1. Vérifier qu'aucune donnée importante n'est présente
-- (Ces requêtes sont pour information uniquement)

-- Vérifier le contenu de users_roles (devrait être vide)
-- SELECT COUNT(*) as users_roles_count FROM users_roles;

-- Vérifier le contenu de roles
-- SELECT * FROM roles;

-- 2. Supprimer la table users_roles en premier (elle référence roles)
DROP TABLE IF EXISTS users_roles CASCADE;

-- 3. Supprimer la table roles
DROP TABLE IF EXISTS roles CASCADE;

-- 4. Commentaire pour documenter le changement
-- Les rôles sont maintenant gérés via la colonne profiles.role
-- Valeurs possibles: 'user', 'admin', 'super_admin'

-- 5. Vérification finale - s'assurer que la colonne role existe bien
SELECT 
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'role';