-- Script pour ajouter un système de rôles utilisateurs dans Supabase
-- À exécuter dans le SQL Editor de Supabase

-- 1. Ajouter une colonne role dans la table profiles si elle n'existe pas
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));

-- 2. Créer un index pour optimiser les requêtes par rôle
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 3. Créer une fonction pour vérifier si un utilisateur est admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Créer une fonction pour vérifier si un utilisateur est super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Créer une politique RLS pour permettre aux admins de voir tous les profils
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  USING (
    auth.uid() = id OR 
    is_admin(auth.uid())
  );

-- 6. Créer une politique RLS pour permettre aux super admins de modifier les rôles
CREATE POLICY "Super admins can update user roles" ON profiles
  FOR UPDATE
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- 7. Créer une vue pour les admins (optionnel)
CREATE OR REPLACE VIEW admin_users AS
SELECT 
  id,
  email,
  full_name,
  company_id,
  role,
  created_at,
  updated_at
FROM profiles
WHERE role IN ('admin', 'super_admin');

-- 8. Donner les permissions sur la vue
GRANT SELECT ON admin_users TO authenticated;

-- 9. Créer une table de logs d'actions admin (optionnel mais recommandé)
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Index pour les logs
CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- 11. RLS pour les logs admin
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin logs" ON admin_logs
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "System can insert admin logs" ON admin_logs
  FOR INSERT
  WITH CHECK (true);

-- Note: Pour promouvoir un utilisateur en admin, exécuter:
-- UPDATE profiles SET role = 'admin' WHERE email = 'user@example.com';