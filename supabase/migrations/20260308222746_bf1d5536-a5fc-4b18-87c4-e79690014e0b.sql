
-- Add plan column to tenants so we can track current subscription plan
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS current_plan TEXT NOT NULL DEFAULT 'free';
