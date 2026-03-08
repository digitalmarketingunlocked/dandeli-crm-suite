ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS check_in_date date,
  ADD COLUMN IF NOT EXISTS check_out_date date,
  ADD COLUMN IF NOT EXISTS guests_count integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS lead_time text;