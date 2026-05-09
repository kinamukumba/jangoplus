-- 1. RPC: vizinhos no ranking semanal
CREATE OR REPLACE FUNCTION public.get_rank_neighbors(_user_id uuid, _radius int DEFAULT 2)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  weekly_xp int,
  rank_position int,
  relation text -- 'above' | 'self' | 'below'
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      us.user_id,
      COALESCE(p.display_name, 'Aluno') AS display_name,
      us.weekly_xp,
      RANK() OVER (ORDER BY us.weekly_xp DESC)::int AS rank_position
    FROM public.user_stats us
    LEFT JOIN public.profiles p ON p.id = us.user_id
    WHERE us.weekly_xp > 0
  ),
  me AS (
    SELECT rank_position FROM ranked WHERE user_id = _user_id
  )
  SELECT
    r.user_id,
    r.display_name,
    r.weekly_xp,
    r.rank_position,
    CASE
      WHEN r.user_id = _user_id THEN 'self'
      WHEN r.rank_position < (SELECT rank_position FROM me) THEN 'above'
      ELSE 'below'
    END AS relation
  FROM ranked r, me
  WHERE r.rank_position BETWEEN GREATEST(1, me.rank_position - _radius)
                            AND me.rank_position + _radius
  ORDER BY r.rank_position ASC;
$$;

-- 2. Distribuir questões existentes por tópicos curados
-- Apenas atualiza questões com topic = 'Geral' (backfill antigo) ou NULL.
DO $$
DECLARE
  s RECORD;
  q RECORD;
  topics text[];
  i int;
BEGIN
  FOR s IN SELECT id, code FROM public.subjects LOOP
    topics := CASE s.code
      WHEN 'MAT' THEN ARRAY['Funções','Derivadas','Geometria','Álgebra','Revisão']
      WHEN 'FIS' THEN ARRAY['Cinemática','Dinâmica','Eletricidade','Ondas','Revisão']
      WHEN 'QUI' THEN ARRAY['Estequiometria','Soluções','Orgânica','Termoquímica','Revisão']
      WHEN 'BIO' THEN ARRAY['Citologia','Genética','Fisiologia','Ecologia','Revisão']
      WHEN 'LP'  THEN ARRAY['Interpretação','Gramática','Redação','Revisão']
      ELSE ARRAY['Revisão']
    END;
    i := 0;
    FOR q IN
      SELECT id FROM public.questions
      WHERE subject_id = s.id AND (topic IS NULL OR topic = 'Geral')
      ORDER BY created_at, id
    LOOP
      UPDATE public.questions
      SET topic = topics[(i % array_length(topics, 1)) + 1]
      WHERE id = q.id;
      i := i + 1;
    END LOOP;
  END LOOP;
END $$;