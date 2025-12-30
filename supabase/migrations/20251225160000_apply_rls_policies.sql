-- Migration to apply Row Level Security (RLS) policies for key CRM tables
-- Target Tables: companies, contacts, listings, activities

-- 1. Ensure RLS is enabled
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Ensure company_id exists in contacts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'company_id') THEN
        ALTER TABLE public.contacts ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;

    -- Ensure company_id exists in activities
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'company_id') THEN
        ALTER TABLE public.activities ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;

    -- Ensure company_id exists in listings (just in case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'company_id') THEN
        ALTER TABLE public.listings ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Helper function to check if user is admin (if not already exists)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Company Policies
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
CREATE POLICY "Users can view their own company" ON public.companies
    FOR SELECT USING (
        id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can update their own company" ON public.companies;
CREATE POLICY "Admins can update their own company" ON public.companies
    FOR UPDATE USING (
        id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND public.is_admin()
    );

-- 4. Contacts Policies
DROP POLICY IF EXISTS "Users can view company contacts" ON public.contacts;
CREATE POLICY "Users can view company contacts" ON public.contacts
    FOR SELECT USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert company contacts" ON public.contacts;
CREATE POLICY "Users can insert company contacts" ON public.contacts
    FOR INSERT WITH CHECK (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update company contacts" ON public.contacts;
CREATE POLICY "Users can update company contacts" ON public.contacts
    FOR UPDATE USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete company contacts" ON public.contacts;
CREATE POLICY "Users can delete company contacts" ON public.contacts
    FOR DELETE USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND public.is_admin()
    );

-- 5. Listings Policies
DROP POLICY IF EXISTS "Users can view company listings" ON public.listings;
CREATE POLICY "Users can view company listings" ON public.listings
    FOR SELECT USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert company listings" ON public.listings;
CREATE POLICY "Users can insert company listings" ON public.listings
    FOR INSERT WITH CHECK (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update company listings" ON public.listings;
CREATE POLICY "Users can update company listings" ON public.listings
    FOR UPDATE USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete company listings" ON public.listings;
CREATE POLICY "Users can delete company listings" ON public.listings
    FOR DELETE USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND public.is_admin()
    );

-- 6. Activities Polices
DROP POLICY IF EXISTS "Users can view company activities" ON public.activities;
CREATE POLICY "Users can view company activities" ON public.activities
    FOR SELECT USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert company activities" ON public.activities;
CREATE POLICY "Users can insert company activities" ON public.activities
    FOR INSERT WITH CHECK (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update company activities" ON public.activities;
CREATE POLICY "Users can update company activities" ON public.activities
    FOR UPDATE USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete company activities" ON public.activities;
CREATE POLICY "Users can delete company activities" ON public.activities
    FOR DELETE USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND public.is_admin()
    );
