-- Migration: Add sub_category_id to profiles table
-- This migration adds a new column to store the sub-category ID for the custom industry classification
-- The column is nullable to allow backward compatibility with existing profiles

-- Add sub_category_id column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS sub_category_id TEXT;

-- Add comment to document the column
COMMENT ON COLUMN profiles.sub_category_id IS 'Sub-category ID from the custom industry classification (Mayday Industries). Nullable for backward compatibility with existing NAF-based profiles.';
