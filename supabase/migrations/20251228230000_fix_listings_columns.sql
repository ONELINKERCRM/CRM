
-- Add missing columns to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS title_ar TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- If ref_number was intended but reference_number exists, we can either rename or add it.
-- Based on the migration history, reference_number is the standard in the listings table.
-- However, if the code is using ref_number, we should probably add an alias or just rename it in the code.
-- Let's stick to reference_number and fix the code.
