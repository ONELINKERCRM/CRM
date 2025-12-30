-- Add localization columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en',
ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Dubai',
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'AED';

-- Add localization columns to companies table for company-wide defaults
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS default_timezone TEXT NOT NULL DEFAULT 'Asia/Dubai',
ADD COLUMN IF NOT EXISTS default_language TEXT NOT NULL DEFAULT 'en';