-- Migration: Add UNIQUE constraint and RLS policies for usecase_nextsteps table
-- This enables upsert operations with ON CONFLICT (usecase_id)

-- First check if the constraint already exists to make this idempotent
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'usecase_nextsteps_usecase_id_key'
        AND table_name = 'usecase_nextsteps'
    ) THEN
        ALTER TABLE usecase_nextsteps
        ADD CONSTRAINT usecase_nextsteps_usecase_id_key UNIQUE (usecase_id);
    END IF;
END $$;

-- Add INSERT policy for usecase_nextsteps (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'usecase_nextsteps'
        AND policyname = 'Users can insert nextsteps'
    ) THEN
        CREATE POLICY "Users can insert nextsteps" ON usecase_nextsteps
        FOR INSERT
        TO authenticated
        WITH CHECK (
            usecase_id IN (
                SELECT u.id FROM usecases u
                JOIN user_companies uc ON uc.company_id = u.company_id
                WHERE uc.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Add UPDATE policy for usecase_nextsteps (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'usecase_nextsteps'
        AND policyname = 'Users can update nextsteps'
    ) THEN
        CREATE POLICY "Users can update nextsteps" ON usecase_nextsteps
        FOR UPDATE
        TO authenticated
        USING (
            usecase_id IN (
                SELECT u.id FROM usecases u
                JOIN user_companies uc ON uc.company_id = u.company_id
                WHERE uc.user_id = auth.uid()
            )
        )
        WITH CHECK (
            usecase_id IN (
                SELECT u.id FROM usecases u
                JOIN user_companies uc ON uc.company_id = u.company_id
                WHERE uc.user_id = auth.uid()
            )
        );
    END IF;
END $$;
