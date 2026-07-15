
CREATE OR REPLACE FUNCTION public.set_org_id_from_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.current_org_id();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['leads','cadences','cadence_enrollments','message_templates','proposal_templates','proposal_sends','whatsapp_instances','scheduled_messages','tasks','company_settings']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_org_id_%1$s ON public.%1$s;', t);
    EXECUTE format('CREATE TRIGGER set_org_id_%1$s BEFORE INSERT ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.set_org_id_from_user();', t);
  END LOOP;
END $$;
