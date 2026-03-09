DROP POLICY IF EXISTS "Authenticated users can read maintenance_mode" ON public.system_settings;
DROP POLICY IF EXISTS "Public can read maintenance_mode" ON public.system_settings;
CREATE POLICY "Public can read maintenance_mode"
ON public.system_settings
FOR SELECT
TO public
USING (key = 'maintenance_mode');