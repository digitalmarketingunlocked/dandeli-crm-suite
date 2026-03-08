
-- Create lead_statuses table for custom statuses per tenant
CREATE TABLE public.lead_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  value text NOT NULL,
  label text NOT NULL,
  color text NOT NULL DEFAULT 'secondary',
  sort_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, value)
);

ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view statuses in their tenant" ON public.lead_statuses FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can insert statuses in their tenant" ON public.lead_statuses FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can update statuses in their tenant" ON public.lead_statuses FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can delete statuses in their tenant" ON public.lead_statuses FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id());
