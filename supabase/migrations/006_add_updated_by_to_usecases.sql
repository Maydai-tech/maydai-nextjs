-- Migration: Add updated_by field to usecases table
-- Description: Track which user last modified each use case
-- Date: 2025-01-21

-- 1. Add updated_by column to usecases table
ALTER TABLE usecases 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id);

-- 2. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_usecases_updated_by ON usecases(updated_by) WHERE updated_by IS NOT NULL;

-- 3. Add comment to document the column
COMMENT ON COLUMN usecases.updated_by IS 'ID de l''utilisateur qui a effectué la dernière modification du cas d''usage';

