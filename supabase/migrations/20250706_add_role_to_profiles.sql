-- Migration: Ajouter la colonne role à la table profiles
-- Date: 2025-07-06
-- Description: Ajoute une colonne role pour gérer les permissions utilisateur

-- 1. Ajouter la colonne role avec valeur par défaut et contrainte
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
CHECK (role IN ('user', 'admin', 'super_admin'));

-- 2. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 3. Commenter la colonne pour la documentation
COMMENT ON COLUMN profiles.role IS 'Rôle de l''utilisateur dans l''application : user (défaut), admin, ou super_admin';

-- 4. Attribuer les rôles aux utilisateurs existants
-- Admin users
UPDATE profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('hugo.faye@gmail.com', 'tech@maydai.io')
);

-- Regular users (explicite pour thomas et toto)
UPDATE profiles 
SET role = 'user' 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('thomas@mayday-consulting.ai', 'toto@toto.toto')
);

-- 5. Vérification finale - afficher les utilisateurs avec leurs rôles
SELECT 
  p.id,
  au.email,
  p.role,
  p.first_name,
  p.last_name
FROM profiles p
JOIN auth.users au ON p.id = au.id
ORDER BY p.role, au.email;