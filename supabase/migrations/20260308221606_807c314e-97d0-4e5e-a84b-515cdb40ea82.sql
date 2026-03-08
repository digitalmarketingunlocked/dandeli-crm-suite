
CREATE TABLE public.subscription_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  plan_name TEXT NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subscription requests in their tenant"
  ON public.subscription_requests
  FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert subscription requests in their tenant"
  ON public.subscription_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id() AND user_id = auth.uid());
