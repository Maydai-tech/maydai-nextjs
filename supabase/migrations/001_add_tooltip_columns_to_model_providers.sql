-- Migration: Add tooltip columns to model_providers table
-- Description: Add columns to store tooltip information for AI providers
-- Date: 2025-01-XX

-- Add tooltip columns to model_providers table
ALTER TABLE model_providers 
ADD COLUMN IF NOT EXISTS tooltip_title TEXT,
ADD COLUMN IF NOT EXISTS tooltip_short_content TEXT,
ADD COLUMN IF NOT EXISTS tooltip_full_content TEXT,
ADD COLUMN IF NOT EXISTS tooltip_icon TEXT DEFAULT '💡',
ADD COLUMN IF NOT EXISTS tooltip_rank INTEGER,
ADD COLUMN IF NOT EXISTS tooltip_rank_text TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_model_providers_name ON model_providers(name);

-- Add comment to document the columns
COMMENT ON COLUMN model_providers.tooltip_title IS 'Title displayed in the tooltip for this provider';
COMMENT ON COLUMN model_providers.tooltip_short_content IS 'Short description displayed in tooltip preview';
COMMENT ON COLUMN model_providers.tooltip_full_content IS 'Full detailed description displayed on tooltip hover';
COMMENT ON COLUMN model_providers.tooltip_icon IS 'Emoji icon displayed in tooltip (default: 💡)';
COMMENT ON COLUMN model_providers.tooltip_rank IS 'Numeric rank for display (e.g., 1, 2, 3 for #1, #2, #3)';
COMMENT ON COLUMN model_providers.tooltip_rank_text IS 'Textual rank for special rankings (e.g., "Challenger", "Leader Européen")';

