-- Allow all agents to create draft listings
-- This enables the auto-save draft feature for all users

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Admin/Manager can create listings" ON public.listings;

-- Create new policy that allows all agents to create listings
-- (They can create drafts, but publishing requires admin approval via status change)
CREATE POLICY "Agents can create listings"
  ON public.listings FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())
  );

-- Update the update policy to allow agents to update their own drafts
DROP POLICY IF EXISTS "Admin/Manager can update any listing" ON public.listings;

CREATE POLICY "Agents can update listings"
  ON public.listings FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())
    AND (
      public.is_listing_admin()
      OR assigned_agent_id = public.get_user_agent_id()
      OR created_by = public.get_user_agent_id()
    )
  );
