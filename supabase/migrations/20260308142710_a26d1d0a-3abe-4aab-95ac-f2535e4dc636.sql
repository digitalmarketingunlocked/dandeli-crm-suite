ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS adults_count integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS kids_count integer DEFAULT 0;