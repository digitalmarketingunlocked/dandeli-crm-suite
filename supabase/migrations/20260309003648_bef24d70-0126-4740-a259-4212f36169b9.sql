DROP POLICY IF EXISTS "Authenticated users can read maintenance_mode" ON public.system_settings;
CREATE POLICY "Authenticated users can read maintenance_mode"
ON public.system_settings
FOR SELECT
TO authenticated
USING (key = 'maintenance_mode');