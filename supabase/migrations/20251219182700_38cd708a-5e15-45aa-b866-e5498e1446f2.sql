-- Add Property Finder Qatar portal
INSERT INTO public.portals (name, display_name, logo_url, base_url, country, is_active)
VALUES (
  'Property Finder Qatar',
  'Property Finder Qatar',
  'https://www.propertyfinder.qa/favicon.ico',
  'https://www.propertyfinder.qa',
  'Qatar',
  true
)
ON CONFLICT (name) DO NOTHING;