-- Fix company creation permissions
-- This migration allows authenticated users to create companies and update their own companies

-- Allow authenticated users to insert companies (to own them)
CREATE POLICY "Users can create companies" ON public.companies
    FOR INSERT 
    WITH CHECK (auth.uid() = created_by);

-- Allow company owners/members to update their company
CREATE POLICY "Users can update companies they belong to" ON public.companies
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        ) OR
        id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );
