// Sistema de exames passados: simulado completo + treino por tópico.
import { supabase } from "@/integrations/supabase/client";
import type { SubjectCode } from "./sekulo-config";

export interface Exam {
  id: string;
  name: string;
  year: number;
  subject_code: SubjectCode;
  duration_minutes: number;
  total_questions: number;
}

export interface ExamQuestion {
  id: string;
  position: number;
  statement: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  topic: string | null;
  subject_code: SubjectCode;
}

export interface TopicBucket {
  subject_code: SubjectCode;
  topic: string;
  count: number;
}

export interface WeakTopic {
  subject_code: SubjectCode;
  topic: string;
  miss_rate: number; // 0..1
  attempts: number;
}

// Lista exames disponíveis
export async function listExams(): Promise<Exam[]> {
  const { data } = await supabase
    .from("exams")
    .select("*")
    .order("year", { ascending: false });
  return (data ?? []) as Exam[];
}

// Busca questões de um exame, ordenadas
export async function getExamQuestions(examId: string): Promise<ExamQuestion[]> {
  const { data } = await supabase
    .from("exam_questions")
    .select(
      "position, question:questions(id, statement, options, correct_index, explanation, topic, subject_id, subjects:subject_id(code))",
    )
    .eq("exam_id", examId)
    .order("position", { ascending: true });

  const rows = (data ?? []) as Array<{
    position: number;
    question: {
      id: string;
      statement: string;
      options: string[];
      correct_index: number;
      explanation: string | null;
      topic: string | null;
      subjects: { code: SubjectCode } | null;
    } | null;
  }>;
  return rows
    .filter((r) => r.question)
    .map((r) => ({
      id: r.question!.id,
      position: r.position,
      statement: r.question!.statement,
      options: r.question!.options,
      correct_index: r.question!.correct_index,
      explanation: r.question!.explanation,
      topic: r.question!.topic,
      subject_code: (r.question!.subjects?.code ?? "REV") as SubjectCode,
    }));
}

// Lista tópicos por disciplina (para treino)
export async function listTopics(): Promise<TopicBucket[]> {
  const { data } = await supabase
    .from("questions")
    .select("topic, subjects:subject_id(code)")
    .not("topic", "is", null);

  const map = new Map<string, TopicBucket>();
  (data ?? []).forEach((row) => {
    const code = ((row as { subjects: { code: string } | null }).subjects?.code ?? "REV") as SubjectCode;
    const topic = (row as { topic: string }).topic;
    const key = `${code}::${topic}`;
    const cur = map.get(key);
    if (cur) cur.count++;
    else map.set(key, { subject_code: code, topic, count: 1 });
  });
  return Array.from(map.values()).sort((a, b) =>
    a.subject_code === b.subject_code ? a.topic.localeCompare(b.topic) : a.subject_code.localeCompare(b.subject_code),
  );
}

// Cria tentativa de exame (simulado iniciado)
export async function startExamAttempt(userId: string, examId: string, total: number): Promise<string> {
  const { data, error } = await supabase
    .from("exam_attempts")
    .insert({ user_id: userId, exam_id: examId, total_questions: total })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// Regista resposta individual
export async function recordExamAnswer(
  userId: string,
  attemptId: string,
  q: ExamQuestion,
  selectedIndex: number,
) {
  const isCorrect = selectedIndex === q.correct_index;
  await supabase.from("exam_attempt_answers").insert({
    attempt_id: attemptId,
    user_id: userId,
    question_id: q.id,
    subject_code: q.subject_code,
    topic: q.topic,
    selected_index: selectedIndex,
    is_correct: isCorrect,
  });
}

// Conclui simulado e calcula pontos fracos
export async function finishExamAttempt(
  userId: string,
  attemptId: string,
  durationSeconds: number,
): Promise<{ correct: number; total: number; score: number; weakTopics: WeakTopic[] }> {
  const { data: answers } = await supabase
    .from("exam_attempt_answers")
    .select("subject_code, topic, is_correct")
    .eq("attempt_id", attemptId);

  const list = (answers ?? []) as Array<{ subject_code: SubjectCode; topic: string | null; is_correct: boolean }>;
  const total = list.length;
  const correct = list.filter((a) => a.is_correct).length;
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);

  // Pontos fracos: agrupa por (subject, topic)
  const buckets = new Map<string, { subject_code: SubjectCode; topic: string; total: number; wrong: number }>();
  list.forEach((a) => {
    if (!a.topic) return;
    const key = `${a.subject_code}::${a.topic}`;
    const cur = buckets.get(key) ?? { subject_code: a.subject_code, topic: a.topic, total: 0, wrong: 0 };
    cur.total++;
    if (!a.is_correct) cur.wrong++;
    buckets.set(key, cur);
  });
  const weakTopics: WeakTopic[] = Array.from(buckets.values())
    .map((b) => ({
      subject_code: b.subject_code,
      topic: b.topic,
      miss_rate: b.total === 0 ? 0 : b.wrong / b.total,
      attempts: b.total,
    }))
    .filter((w) => w.miss_rate >= 0.5 && w.attempts >= 1)
    .sort((a, b) => b.miss_rate - a.miss_rate)
    .slice(0, 5);

  await supabase
    .from("exam_attempts")
    .update({
      finished_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      total_questions: total,
      correct_count: correct,
      score,
    })
    .eq("id", attemptId);

  // Persiste pontos fracos no user_stats para a próxima missão priorizar
  await supabase
    .from("user_stats")
    .update({ weak_topics: weakTopics as unknown as never, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  return { correct, total, score, weakTopics };
}

// Busca questões de um tópico (para treino)
export async function getTopicQuestions(subjectCode: SubjectCode, topic: string): Promise<ExamQuestion[]> {
  const { data: subj } = await supabase.from("subjects").select("id").eq("code", subjectCode).maybeSingle();
  if (!subj) return [];
  const { data } = await supabase
    .from("questions")
    .select("id, statement, options, correct_index, explanation, topic")
    .eq("subject_id", subj.id)
    .eq("topic", topic)
    .limit(15);
  return ((data ?? []) as Array<{
    id: string;
    statement: string;
    options: string[];
    correct_index: number;
    explanation: string | null;
    topic: string | null;
  }>).map((q, i) => ({
    id: q.id,
    position: i + 1,
    statement: q.statement,
    options: q.options,
    correct_index: q.correct_index,
    explanation: q.explanation,
    topic: q.topic,
    subject_code: subjectCode,
  }));
}
