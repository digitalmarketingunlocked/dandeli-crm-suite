CREATE POLICY "Authenticated users can read plan_feature_access"
ON public.system_settings
FOR SELECT
TO authenticated
USING (key = 'plan_feature_access');