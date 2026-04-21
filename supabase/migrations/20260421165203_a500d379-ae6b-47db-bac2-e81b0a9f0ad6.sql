-- Sistema de ligas e snapshots de ranking semanal

ALTER TABLE public.user_stats
  ADD COLUMN IF NOT EXISTS league text NOT NULL DEFAULT 'bronze',
  ADD COLUMN IF NOT EXISTS previous_week_rank integer,
  ADD COLUMN IF NOT EXISTS last_week_xp integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.rank_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  week_start_date date NOT NULL,
  rank_position integer NOT NULL,
  weekly_xp integer NOT NULL,
  league text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start_date)
);

ALTER TABLE public.rank_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own snapshots select"
  ON public.rank_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "own snapshots insert"
  ON public.rank_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP VIEW IF EXISTS public.weekly_leaderboard;
CREATE VIEW public.weekly_leaderboard
WITH (security_invoker = true)
AS
SELECT
  us.user_id,
  COALESCE(p.display_name, 'Aluno') AS display_name,
  us.weekly_xp,
  us.weekly_missions,
  us.current_streak,
  us.level,
  us.league,
  us.week_start_date
FROM public.user_stats us
LEFT JOIN public.profiles p ON p.id = us.user_id
WHERE us.weekly_xp > 0;

CREATE OR REPLACE FUNCTION public.get_user_rank(_user_id uuid)
RETURNS TABLE (
  rank_position integer,
  total integer,
  weekly_xp integer,
  league text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      user_id,
      weekly_xp AS xp,
      RANK() OVER (ORDER BY weekly_xp DESC) AS pos
    FROM public.user_stats
    WHERE weekly_xp > 0
  )
  SELECT
    COALESCE((SELECT pos::int FROM ranked WHERE user_id = _user_id), 0),
    (SELECT COUNT(*)::int FROM public.user_stats WHERE weekly_xp > 0),
    COALESCE((SELECT weekly_xp FROM public.user_stats WHERE user_id = _user_id), 0),
    COALESCE((SELECT league FROM public.user_stats WHERE user_id = _user_id), 'bronze');
$$;

CREATE OR REPLACE FUNCTION public.preview_rank_after_xp(_user_id uuid, _additional_xp integer)
RETURNS TABLE (
  current_position integer,
  projected_position integer,
  total integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT COALESCE(weekly_xp, 0) AS xp FROM public.user_stats WHERE user_id = _user_id
  ),
  projected AS (
    SELECT (SELECT xp FROM me) + _additional_xp AS new_xp
  )
  SELECT
    COALESCE((
      SELECT pos::int FROM (
        SELECT user_id, RANK() OVER (ORDER BY weekly_xp DESC) AS pos
        FROM public.user_stats
        WHERE weekly_xp > 0
      ) r WHERE r.user_id = _user_id
    ), 0),
    (
      SELECT COUNT(*)::int + 1
      FROM public.user_stats
      WHERE weekly_xp > (SELECT new_xp FROM projected)
        AND user_id <> _user_id
    ),
    (SELECT COUNT(*)::int FROM public.user_stats WHERE weekly_xp > 0);
$$;

CREATE INDEX IF NOT EXISTS idx_user_stats_weekly_xp ON public.user_stats (weekly_xp DESC);
CREATE INDEX IF NOT EXISTS idx_rank_snapshots_user_week ON public.rank_snapshots (user_id, week_start_date DESC);