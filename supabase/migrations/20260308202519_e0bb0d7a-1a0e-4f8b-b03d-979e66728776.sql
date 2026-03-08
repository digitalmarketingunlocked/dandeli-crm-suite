ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS pricing_total numeric,
  ADD COLUMN IF NOT EXISTS transport text;