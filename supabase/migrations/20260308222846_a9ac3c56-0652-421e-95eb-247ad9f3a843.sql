
-- Allow admins to update tenants (e.g. current_plan)
CREATE POLICY "Admins can update all tenants"
  ON public.tenants FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
