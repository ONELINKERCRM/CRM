-- Fix search_path for functions to address security warnings
CREATE OR REPLACE FUNCTION public.update_campaign_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.campaign_analytics (campaign_id, company_id)
  SELECT NEW.campaign_id, NEW.company_id
  WHERE NOT EXISTS (SELECT 1 FROM public.campaign_analytics WHERE campaign_id = NEW.campaign_id)
  ON CONFLICT (campaign_id) DO NOTHING;
  
  UPDATE public.campaign_analytics SET
    total_recipients = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id),
    total_queued = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'queued'),
    total_sending = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'sending'),
    total_sent = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'sent'),
    total_delivered = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'delivered'),
    total_read = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'read'),
    total_failed = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'failed'),
    total_skipped = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'skipped'),
    updated_at = now()
  WHERE campaign_id = NEW.campaign_id;
  
  UPDATE public.campaign_analytics SET
    delivery_rate = CASE WHEN total_sent > 0 THEN (total_delivered::NUMERIC / total_sent * 100) ELSE 0 END,
    read_rate = CASE WHEN total_delivered > 0 THEN (total_read::NUMERIC / total_delivered * 100) ELSE 0 END,
    failure_rate = CASE WHEN total_recipients > 0 THEN (total_failed::NUMERIC / total_recipients * 100) ELSE 0 END
  WHERE campaign_id = NEW.campaign_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.log_campaign_action(
  p_campaign_id UUID,
  p_company_id UUID,
  p_action TEXT,
  p_action_type TEXT,
  p_details JSONB DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL,
  p_recipient_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.campaign_logs (campaign_id, company_id, action, action_type, details, performed_by, recipient_id)
  VALUES (p_campaign_id, p_company_id, p_action, p_action_type, p_details, p_performed_by, p_recipient_id)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;