-- Create enum for agent roles
DO $$ BEGIN
    CREATE TYPE public.agent_role AS ENUM ('admin', 'manager', 'team_leader', 'agent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for agent status (including 'invited')
DO $$ BEGIN
    CREATE TYPE public.agent_status AS ENUM ('invited', 'active', 'inactive', 'on_leave');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  role agent_role NOT NULL DEFAULT 'agent',
  status agent_status NOT NULL DEFAULT 'invited',
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  permissions JSONB NOT NULL DEFAULT '{"leads": true, "listings": true, "marketing": false, "reports": false, "integrations": false}'::jsonb,
  invitation_token TEXT,
  invitation_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- RLS policies for teams (authenticated users can view)
DROP POLICY IF EXISTS "Authenticated users can view teams" ON public.teams;
CREATE POLICY "Authenticated users can view teams"
ON public.teams
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage teams" ON public.teams;
CREATE POLICY "Authenticated users can manage teams"
ON public.teams
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- RLS policies for agents
DROP POLICY IF EXISTS "Authenticated users can view agents" ON public.agents;
CREATE POLICY "Authenticated users can view agents"
ON public.agents
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage agents" ON public.agents;
CREATE POLICY "Authenticated users can manage agents"
ON public.agents
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_agents_updated_at ON public.agents;
CREATE TRIGGER update_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();