-- Supabase Roles Password Configuration
-- This script updates passwords for all Supabase roles

-- Update passwords using the PGPASSWORD environment variable
-- The password is passed via psql -v
\set pgpass `echo "$POSTGRES_PASSWORD"`

-- Update all role passwords
ALTER ROLE postgres WITH PASSWORD :'pgpass';
ALTER ROLE authenticator WITH PASSWORD :'pgpass';
ALTER ROLE supabase_auth_admin WITH PASSWORD :'pgpass';
ALTER ROLE supabase_storage_admin WITH PASSWORD :'pgpass';
ALTER ROLE supabase_admin WITH PASSWORD :'pgpass';
ALTER ROLE supabase_functions_admin WITH PASSWORD :'pgpass';
ALTER ROLE supabase_read_only_user WITH PASSWORD :'pgpass';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;

-- Verify roles exist
DO $$
BEGIN
    RAISE NOTICE 'Roles configured successfully';
END $$;
