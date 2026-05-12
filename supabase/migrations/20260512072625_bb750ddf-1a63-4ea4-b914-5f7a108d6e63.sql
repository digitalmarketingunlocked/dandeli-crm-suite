
CREATE POLICY "Public can read registration_enabled"
ON public.system_settings FOR SELECT TO anon, authenticated
USING (key = 'registration_enabled');
