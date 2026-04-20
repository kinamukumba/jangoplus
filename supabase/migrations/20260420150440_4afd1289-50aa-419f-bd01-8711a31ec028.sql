
CREATE OR REPLACE FUNCTION public.level_for_xp(xp integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN xp < 500 THEN 1
    WHEN xp < 1200 THEN 2
    WHEN xp < 2500 THEN 3
    ELSE 3 + ((xp - 2500) / 1500) + 1
  END;
$$;
