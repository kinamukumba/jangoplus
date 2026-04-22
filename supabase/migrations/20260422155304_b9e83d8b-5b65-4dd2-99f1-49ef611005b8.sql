-- Add Mathematics subject (used for Engineering goal)
ALTER TABLE public.daily_missions
  ADD COLUMN IF NOT EXISTS mat_target integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_mat numeric;
