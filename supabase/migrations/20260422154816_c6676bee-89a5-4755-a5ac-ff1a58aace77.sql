-- Onboarding fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS goal text,
  ADD COLUMN IF NOT EXISTS university text,
  ADD COLUMN IF NOT EXISTS onboarded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS diagnostic_score integer;
