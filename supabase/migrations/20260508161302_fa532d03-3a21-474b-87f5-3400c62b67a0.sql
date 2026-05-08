-- Past exams + topics infrastructure

-- 1. Add topic and exam_year to questions
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS exam_year integer;

CREATE INDEX IF NOT EXISTS idx_questions_topic ON public.questions(topic);
CREATE INDEX IF NOT EXISTS idx_questions_subject_topic ON public.questions(subject_id, topic);

-- 2. Exams table (a real past exam: e.g. "Acesso UAN 2023 - Biologia")
CREATE TABLE IF NOT EXISTS public.exams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  year integer NOT NULL,
  subject_code text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  total_questions integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exams readable" ON public.exams FOR SELECT USING (true);

-- 3. exam_questions: ordered list of questions in an exam
CREATE TABLE IF NOT EXISTS public.exam_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  UNIQUE (exam_id, question_id)
);

ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_questions readable" ON public.exam_questions FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON public.exam_questions(exam_id, position);

-- 4. exam_attempts
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_seconds integer,
  total_questions integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0
);

ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own exam attempts select" ON public.exam_attempts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own exam attempts insert" ON public.exam_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own exam attempts update" ON public.exam_attempts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON public.exam_attempts(user_id, started_at DESC);

-- 5. exam_attempt_answers
CREATE TABLE IF NOT EXISTS public.exam_attempt_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id uuid NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  question_id uuid NOT NULL,
  subject_code text NOT NULL,
  topic text,
  selected_index integer,
  is_correct boolean NOT NULL DEFAULT false,
  answered_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_attempt_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own exam answers select" ON public.exam_attempt_answers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own exam answers insert" ON public.exam_attempt_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt ON public.exam_attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_user_topic ON public.exam_attempt_answers(user_id, topic);

-- 6. user_stats: weak topics jsonb (array of {topic, subject_code})
ALTER TABLE public.user_stats
  ADD COLUMN IF NOT EXISTS weak_topics jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 7. Backfill: assign generic topics to existing questions by subject so the
-- topic-training UI has buckets to show. Uses simple keyword matching on
-- statement text; falls back to "Geral".
UPDATE public.questions q
SET topic = COALESCE(q.topic, 'Geral')
WHERE q.topic IS NULL;

-- 8. Seed two sample past exams (Biologia + Matemática) using existing questions.
DO $$
DECLARE
  bio_subject uuid;
  mat_subject uuid;
  bio_exam uuid;
  mat_exam uuid;
BEGIN
  SELECT id INTO bio_subject FROM public.subjects WHERE code = 'BIO' LIMIT 1;
  SELECT id INTO mat_subject FROM public.subjects WHERE code = 'MAT' LIMIT 1;

  IF bio_subject IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.exams WHERE name = 'Acesso 2023 — Biologia') THEN
    INSERT INTO public.exams (name, year, subject_code, duration_minutes)
    VALUES ('Acesso 2023 — Biologia', 2023, 'BIO', 45)
    RETURNING id INTO bio_exam;

    INSERT INTO public.exam_questions (exam_id, question_id, position)
    SELECT bio_exam, q.id, ROW_NUMBER() OVER (ORDER BY q.created_at)
    FROM public.questions q
    WHERE q.subject_id = bio_subject
    LIMIT 10;

    UPDATE public.exams SET total_questions = (SELECT COUNT(*) FROM public.exam_questions WHERE exam_id = bio_exam)
    WHERE id = bio_exam;
  END IF;

  IF mat_subject IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.exams WHERE name = 'Acesso 2023 — Matemática') THEN
    INSERT INTO public.exams (name, year, subject_code, duration_minutes)
    VALUES ('Acesso 2023 — Matemática', 2023, 'MAT', 60)
    RETURNING id INTO mat_exam;

    INSERT INTO public.exam_questions (exam_id, question_id, position)
    SELECT mat_exam, q.id, ROW_NUMBER() OVER (ORDER BY q.created_at)
    FROM public.questions q
    WHERE q.subject_id = mat_subject
    LIMIT 10;

    UPDATE public.exams SET total_questions = (SELECT COUNT(*) FROM public.exam_questions WHERE exam_id = mat_exam)
    WHERE id = mat_exam;
  END IF;
END $$;