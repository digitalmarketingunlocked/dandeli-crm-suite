ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS property_name text,
  ADD COLUMN IF NOT EXISTS room_type text,
  ADD COLUMN IF NOT EXISTS pricing numeric,
  ADD COLUMN IF NOT EXISTS activities text;