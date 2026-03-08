
-- Add follow_up_date and recurring columns to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS follow_up_date date;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS recurring text DEFAULT 'none';

-- Create call_history table
CREATE TABLE public.call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  called_at timestamp with time zone NOT NULL DEFAULT now(),
  duration text,
  notes text,
  created_by uuid
);

ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view call history in their tenant" ON public.call_history FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can insert call history in their tenant" ON public.call_history FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can delete call history in their tenant" ON public.call_history FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id());

-- Create reminders table
CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  reminder_date timestamp with time zone NOT NULL,
  message text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reminders in their tenant" ON public.reminders FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can insert reminders in their tenant" ON public.reminders FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can update reminders in their tenant" ON public.reminders FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can delete reminders in their tenant" ON public.reminders FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id());
