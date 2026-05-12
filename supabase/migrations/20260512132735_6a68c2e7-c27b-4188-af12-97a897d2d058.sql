
-- 1) Lock tenant_id on profile updates
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND tenant_id = get_user_tenant_id());

-- 2) Restrict team_invites writes to admins
DROP POLICY IF EXISTS "Users can insert invites in their tenant" ON public.team_invites;
DROP POLICY IF EXISTS "Users can update invites in their tenant" ON public.team_invites;
DROP POLICY IF EXISTS "Users can delete invites in their tenant" ON public.team_invites;

CREATE POLICY "Admins can insert invites in their tenant" ON public.team_invites
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update invites in their tenant" ON public.team_invites
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete invites in their tenant" ON public.team_invites
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));

-- 3) Restrict lead_statuses writes to admins
DROP POLICY IF EXISTS "Users can insert statuses in their tenant" ON public.lead_statuses;
DROP POLICY IF EXISTS "Users can update statuses in their tenant" ON public.lead_statuses;
DROP POLICY IF EXISTS "Users can delete statuses in their tenant" ON public.lead_statuses;

CREATE POLICY "Admins can insert statuses in their tenant" ON public.lead_statuses
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update statuses in their tenant" ON public.lead_statuses
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete statuses in their tenant" ON public.lead_statuses
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));
