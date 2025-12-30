-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'team_leader', 'agent');

-- Create user_roles table for secure role management
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'agent',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'manager' THEN 2 
      WHEN 'team_leader' THEN 3 
      WHEN 'agent' THEN 4 
    END
  LIMIT 1
$$;

-- RLS Policies for user_roles table
-- Only admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- Only admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create permissions table for granular access control
CREATE TABLE public.role_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role app_role NOT NULL,
    permission_key text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (role, permission_key)
);

-- Enable RLS on role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Everyone can view permissions, only admins can modify
CREATE POLICY "Authenticated users can view permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default permissions for each role
INSERT INTO public.role_permissions (role, permission_key) VALUES
-- Admin permissions (all)
('admin', 'leads.view'), ('admin', 'leads.create'), ('admin', 'leads.edit'), ('admin', 'leads.delete'),
('admin', 'listings.view'), ('admin', 'listings.create'), ('admin', 'listings.edit'), ('admin', 'listings.delete'),
('admin', 'teams.view'), ('admin', 'teams.create'), ('admin', 'teams.edit'), ('admin', 'teams.delete'),
('admin', 'agents.view'), ('admin', 'agents.create'), ('admin', 'agents.edit'), ('admin', 'agents.delete'),
('admin', 'marketing.view'), ('admin', 'marketing.create'), ('admin', 'marketing.edit'), ('admin', 'marketing.delete'),
('admin', 'reports.view'), ('admin', 'reports.export'),
('admin', 'settings.view'), ('admin', 'settings.edit'),
('admin', 'billing.view'), ('admin', 'billing.manage'),
('admin', 'integrations.view'), ('admin', 'integrations.manage'),
-- Manager permissions
('manager', 'leads.view'), ('manager', 'leads.create'), ('manager', 'leads.edit'), ('manager', 'leads.delete'),
('manager', 'listings.view'), ('manager', 'listings.create'), ('manager', 'listings.edit'), ('manager', 'listings.delete'),
('manager', 'teams.view'), ('manager', 'teams.edit'),
('manager', 'agents.view'), ('manager', 'agents.edit'),
('manager', 'marketing.view'), ('manager', 'marketing.create'), ('manager', 'marketing.edit'),
('manager', 'reports.view'), ('manager', 'reports.export'),
('manager', 'settings.view'),
-- Team Leader permissions
('team_leader', 'leads.view'), ('team_leader', 'leads.create'), ('team_leader', 'leads.edit'),
('team_leader', 'listings.view'), ('team_leader', 'listings.create'), ('team_leader', 'listings.edit'),
('team_leader', 'teams.view'),
('team_leader', 'agents.view'),
('team_leader', 'reports.view'),
-- Agent permissions
('agent', 'leads.view'), ('agent', 'leads.create'), ('agent', 'leads.edit'),
('agent', 'listings.view'),
('agent', 'reports.view');

-- Create trigger for updated_at
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();