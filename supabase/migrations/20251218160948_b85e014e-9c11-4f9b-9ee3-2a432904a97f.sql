-- Add "Uncontacted" stage for all companies that don't have it
INSERT INTO lead_stages (company_id, name, color, position, is_default, is_won, is_lost)
SELECT DISTINCT company_id, 'Uncontacted', '#6366F1', 0, true, false, false
FROM lead_stages
WHERE company_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM lead_stages ls2 
  WHERE ls2.company_id = lead_stages.company_id 
  AND ls2.name = 'Uncontacted'
);

-- Update positions for existing stages to shift them after Uncontacted
UPDATE lead_stages 
SET position = position + 1 
WHERE name != 'Uncontacted' 
AND position >= 0;

-- Set Uncontacted as the default stage (unset other defaults)
UPDATE lead_stages 
SET is_default = false 
WHERE name != 'Uncontacted';

UPDATE lead_stages 
SET is_default = true 
WHERE name = 'Uncontacted';