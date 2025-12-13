-- Migration: Add notes and variants fields to compl_ai_models
-- Description: Add notes_short, notes_long for tooltips and variants array for model variations
-- Date: 2025-01-08

-- 1. Add notes and variants columns to compl_ai_models table
ALTER TABLE compl_ai_models 
ADD COLUMN IF NOT EXISTS notes_short TEXT,
ADD COLUMN IF NOT EXISTS notes_long TEXT,
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

-- 2. Create GIN index on variants for efficient JSONB queries (if needed in future)
CREATE INDEX IF NOT EXISTS idx_compl_ai_models_variants ON compl_ai_models USING GIN (variants);

-- 3. Add comments to document the columns
COMMENT ON COLUMN compl_ai_models.notes_short IS 'Description courte du modèle pour prévisualisation (max 150 caractères)';
COMMENT ON COLUMN compl_ai_models.notes_long IS 'Description complète du modèle affichée dans l''infobulle';
COMMENT ON COLUMN compl_ai_models.variants IS 'Array JSON des variantes du modèle (ex: ["GPT-5", "GPT-5 mini", "GPT-5 nano"])';

-- 4. Add constraints for data quality
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_notes_short_length'
    ) THEN
        ALTER TABLE compl_ai_models 
        ADD CONSTRAINT check_notes_short_length 
        CHECK (notes_short IS NULL OR length(notes_short) <= 150);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_notes_long_length'
    ) THEN
        ALTER TABLE compl_ai_models 
        ADD CONSTRAINT check_notes_long_length 
        CHECK (notes_long IS NULL OR length(notes_long) <= 1000);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_variants_is_array'
    ) THEN
        ALTER TABLE compl_ai_models 
        ADD CONSTRAINT check_variants_is_array 
        CHECK (jsonb_typeof(variants) = 'array');
    END IF;
END $$;








