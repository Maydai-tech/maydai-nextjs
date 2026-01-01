#!/bin/bash
# Script d'initialisation des mots de passe Supabase
# Execute au premier demarrage de PostgreSQL

set -e

# Attendre que PostgreSQL soit pret
until pg_isready -h localhost -p 5432; do
  echo "Waiting for PostgreSQL..."
  sleep 1
done

# Mettre a jour les mots de passe des roles
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Mise a jour des mots de passe pour tous les roles Supabase
    ALTER ROLE postgres WITH PASSWORD '$POSTGRES_PASSWORD';
    ALTER ROLE authenticator WITH PASSWORD '$POSTGRES_PASSWORD';
    ALTER ROLE supabase_auth_admin WITH PASSWORD '$POSTGRES_PASSWORD';
    ALTER ROLE supabase_storage_admin WITH PASSWORD '$POSTGRES_PASSWORD';
    ALTER ROLE supabase_admin WITH PASSWORD '$POSTGRES_PASSWORD';

    -- Verifier que les roles existent
    SELECT rolname FROM pg_roles WHERE rolname LIKE 'supabase%' OR rolname = 'authenticator';
EOSQL

echo "Passwords updated successfully!"
