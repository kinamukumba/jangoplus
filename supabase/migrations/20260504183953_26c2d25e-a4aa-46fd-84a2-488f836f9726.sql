
-- Bloom taxonomy integration
-- 1 = Lembrar (Base), 2 = Entender (Base), 3 = Aplicar (Intermédio), 4 = Analisar (Avançado)
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS bloom_level smallint NOT NULL DEFAULT 1
  CHECK (bloom_level BETWEEN 1 AND 4);

-- Backfill from existing difficulty so questions are immediately usable
UPDATE public.questions SET bloom_level = CASE
  WHEN difficulty = 'easy'   THEN 1
  WHEN difficulty = 'medium' THEN 2
  WHEN difficulty = 'hard'   THEN 3
  ELSE 1
END
WHERE bloom_level = 1; -- only touch defaults

-- Track highest unlocked Bloom level per user (starts at 2 = Entender)
ALTER TABLE public.user_stats
  ADD COLUMN IF NOT EXISTS unlocked_bloom_level smallint NOT NULL DEFAULT 2
  CHECK (unlocked_bloom_level BETWEEN 1 AND 4);

-- Persist Bloom level on each attempt for reporting
ALTER TABLE public.mission_attempts
  ADD COLUMN IF NOT EXISTS bloom_level smallint;

CREATE INDEX IF NOT EXISTS idx_questions_subject_bloom
  ON public.questions(subject_id, bloom_level);
CREATE INDEX IF NOT EXISTS idx_attempts_user_bloom
  ON public.mission_attempts(user_id, bloom_level);
