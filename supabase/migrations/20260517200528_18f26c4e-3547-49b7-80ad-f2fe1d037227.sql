ALTER TABLE public.reminders 
  ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

-- Reactivate recent reminders that were auto-deactivated but never acted on
UPDATE public.reminders 
SET is_active = true 
WHERE is_active = false 
  AND reminder_date >= now() - INTERVAL '7 days'
  AND reminder_date <= now() + INTERVAL '7 days';