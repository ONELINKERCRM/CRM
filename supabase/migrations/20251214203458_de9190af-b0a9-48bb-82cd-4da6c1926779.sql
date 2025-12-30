-- Update free plan limits
UPDATE pricing_plans 
SET 
  lead_limit = 150,
  listing_limit = 20
WHERE plan_type = 'free';