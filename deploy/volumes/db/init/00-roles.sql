-- Script d'initialisation des mots de passe Supabase
-- Ce script est execute au premier demarrage de la base

-- Definir le mot de passe pour tous les roles Supabase
DO $$
DECLARE
    pgpass TEXT := current_setting('app.settings.postgres_password', true);
BEGIN
    -- Si la variable n'est pas definie, utiliser POSTGRES_PASSWORD de l'environnement
    IF pgpass IS NULL OR pgpass = '' THEN
        -- Recuperer depuis les variables d'environnement n'est pas possible directement en SQL
        -- On va utiliser une approche differente
        RAISE NOTICE 'Password will be set from environment variable';
    END IF;
END $$;

-- Les mots de passe seront definis via le script shell ci-dessous
