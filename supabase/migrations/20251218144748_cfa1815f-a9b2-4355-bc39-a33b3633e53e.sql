
-- Add unique constraint on lead_stages to prevent duplicate stage names per company (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS lead_stages_company_name_unique 
ON lead_stages (company_id, LOWER(name));

-- Add unique constraint on lead_groups to prevent duplicate group names per company (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS lead_groups_company_name_unique 
ON lead_groups (company_id, LOWER(name));
