-- Add product_mode column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN product_mode text NOT NULL DEFAULT 'CRM' 
CHECK (product_mode IN ('CRM', 'CHATBOT'));