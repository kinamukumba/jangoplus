
-- 1. Extend user_stats with progression fields
ALTER TABLE public.user_stats
  ADD COLUMN IF NOT EXISTS xp_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS weekly_xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_missions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS week_start_date date NOT NULL DEFAULT date_trunc('week', now())::date;

-- 2. XP audit table (prevents farming — every XP change is logged)
CREATE TABLE IF NOT EXISTS public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mission_id uuid,
  kind text NOT NULL, -- 'mission_complete' | 'correct_answer' | 'review' | 'streak_3' | 'streak_7' | 'mission_failed'
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own xp events select" ON public.xp_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own xp events insert" ON public.xp_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_xp_events_user_created ON public.xp_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_events_mission_kind ON public.xp_events(mission_id, kind);

-- 3. Level calculation (simple curve: 500, 1200, 2500, then +1500 per level)
CREATE OR REPLACE FUNCTION public.level_for_xp(xp integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN xp < 500 THEN 1
    WHEN xp < 1200 THEN 2
    WHEN xp < 2500 THEN 3
    ELSE 3 + ((xp - 2500) / 1500) + 1
  END;
$$;

-- 4. Weekly leaderboard — week starts Monday
CREATE OR REPLACE VIEW public.weekly_leaderboard
WITH (security_invoker = true)
AS
SELECT
  us.user_id,
  COALESCE(p.display_name, 'Aluno') AS display_name,
  us.weekly_xp,
  us.weekly_missions,
  us.current_streak,
  us.level,
  us.week_start_date
FROM public.user_stats us
LEFT JOIN public.profiles p ON p.id = us.user_id
WHERE us.week_start_date = date_trunc('week', now())::date
ORDER BY us.weekly_xp DESC, us.weekly_missions DESC;

GRANT SELECT ON public.weekly_leaderboard TO authenticated, anon;
