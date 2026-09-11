-- Migration: Sécurisation de la colonne 'role' sur la table profiles
-- Bloque l'élévation de privilèges (IDOR/RLS bypass) depuis le frontend.

-- 1. Création de la fonction de protection
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req_role text;
BEGIN
  -- Récupère le rôle issu du JWT Supabase (ex: anon, authenticated, service_role)
  -- Le paramètre 'true' permet de ne pas crasher si la variable n'existe pas (ex: requêtes internes)
  req_role := current_setting('request.jwt.claim.role', true);

  -- Bypass autorisé uniquement pour notre backend API (service_role) ou le super-utilisateur DB (postgres)
  IF req_role = 'service_role' OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- Défense active contre les clients frontend (authenticated / anon)
  IF TG_OP = 'INSERT' THEN
    -- Écrase toute tentative d'injection de rôle à l'inscription
    NEW.role = NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Restaure silencieusement l'ancien rôle lors d'un PATCH du profil
    NEW.role = OLD.role;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Attachement du Trigger
DROP TRIGGER IF EXISTS ensure_role_security ON public.profiles;

CREATE TRIGGER ensure_role_security
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();
