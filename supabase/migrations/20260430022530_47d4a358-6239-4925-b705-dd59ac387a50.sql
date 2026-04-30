CREATE OR REPLACE FUNCTION public.create_followup_reminder_for_new_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.reminders (contact_id, tenant_id, reminder_date, message, is_active, created_by)
  VALUES (
    NEW.id,
    NEW.tenant_id,
    NEW.created_at + INTERVAL '3 hours',
    'Time to follow up with ' || COALESCE(NEW.name, 'this lead'),
    TRUE,
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_followup_reminder ON public.contacts;
CREATE TRIGGER trg_create_followup_reminder
AFTER INSERT ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.create_followup_reminder_for_new_lead();