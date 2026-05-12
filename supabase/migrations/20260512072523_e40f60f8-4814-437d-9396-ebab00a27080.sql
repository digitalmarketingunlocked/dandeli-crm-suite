
-- Restrict public-role policies to authenticated only
-- contacts
DROP POLICY IF EXISTS "Admins can view all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can create contacts in their tenant" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their tenant" ON public.contacts;
DROP POLICY IF EXISTS "Users can update contacts in their tenant" ON public.contacts;
DROP POLICY IF EXISTS "Users can view contacts in their tenant" ON public.contacts;

CREATE POLICY "Admins can view all contacts" ON public.contacts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view contacts in their tenant" ON public.contacts FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can create contacts in their tenant" ON public.contacts FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can update contacts in their tenant" ON public.contacts FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can delete contacts in their tenant" ON public.contacts FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id());

-- deals
DROP POLICY IF EXISTS "Admins can view all deals" ON public.deals;
DROP POLICY IF EXISTS "Users can create deals in their tenant" ON public.deals;
DROP POLICY IF EXISTS "Users can delete deals in their tenant" ON public.deals;
DROP POLICY IF EXISTS "Users can update deals in their tenant" ON public.deals;
DROP POLICY IF EXISTS "Users can view deals in their tenant" ON public.deals;

CREATE POLICY "Admins can view all deals" ON public.deals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view deals in their tenant" ON public.deals FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can create deals in their tenant" ON public.deals FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can update deals in their tenant" ON public.deals FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can delete deals in their tenant" ON public.deals FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id());

-- profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.profiles;

CREATE POLICY "Users can view profiles in their tenant" ON public.profiles FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- tenants
DROP POLICY IF EXISTS "Users can view their own tenant" ON public.tenants;
CREATE POLICY "Users can view their own tenant" ON public.tenants FOR SELECT TO authenticated USING (id = public.get_user_tenant_id());

-- user_roles
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Lock down SECURITY DEFINER functions: revoke from anon/public; trigger-only ones from authenticated too
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_followup_reminder_for_new_lead() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
