-- Enable REPLICA IDENTITY FULL for complete realtime updates
ALTER TABLE public.leads REPLICA IDENTITY FULL;