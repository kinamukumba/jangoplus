// Carrega/cria a missão diária e calcula sequência + atraso.
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TARGETS, diffDays, todayISO, type SubjectCode } from "./sekulo-config";

export interface DailyMission {
  id: string;
  user_id: string;
  mission_date: string;
  bio_target: number;
  qui_target: number;
  fis_target: number;
  rev_target: number;
  completed: boolean;
  completed_at: string | null;
  score_total: number | null;
  score_bio: number | null;
  score_qui: number | null;
  score_fis: number | null;
  score_rev: number | null;
}

export interface UserStats {
  user_id: string;
  current_streak: number;
  delay_days: number;
  last_completed_date: string | null;
}

export const TARGET_FIELDS: Record<SubjectCode, keyof Pick<DailyMission, "bio_target" | "qui_target" | "fis_target" | "rev_target">> = {
  BIO: "bio_target",
  QUI: "qui_target",
  FIS: "fis_target",
  REV: "rev_target",
};

export const SCORE_FIELDS: Record<SubjectCode, keyof Pick<DailyMission, "score_bio" | "score_qui" | "score_fis" | "score_rev">> = {
  BIO: "score_bio",
  QUI: "score_qui",
  FIS: "score_fis",
  REV: "score_rev",
};

export async function getOrCreateTodayMission(userId: string): Promise<DailyMission> {
  const today = todayISO();

  // 1. Verifica missão de hoje
  const { data: existing } = await supabase
    .from("daily_missions")
    .select("*")
    .eq("user_id", userId)
    .eq("mission_date", today)
    .maybeSingle();

  if (existing) return existing as DailyMission;

  // 2. Calcula consequência: aumenta carga se atrasado
  const stats = await getOrCreateStats(userId);
  const extraLoad = Math.min(stats.delay_days, 3); // até +3 por disciplina

  const { data: created, error } = await supabase
    .from("daily_missions")
    .insert({
      user_id: userId,
      mission_date: today,
      bio_target: DEFAULT_TARGETS.BIO + extraLoad,
      qui_target: DEFAULT_TARGETS.QUI + extraLoad,
      fis_target: DEFAULT_TARGETS.FIS + extraLoad,
      rev_target: DEFAULT_TARGETS.REV + extraLoad,
    })
    .select("*")
    .single();

  if (error) throw error;
  return created as DailyMission;
}

export async function getOrCreateStats(userId: string): Promise<UserStats> {
  const { data: existing } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    // Recalcula atraso baseado no last_completed_date
    const today = todayISO();
    const lastDate = existing.last_completed_date;
    let delay = 0;
    if (lastDate) {
      const d = diffDays(lastDate, today);
      // Se cumpriu ontem (d=1) ou hoje (d=0): sem atraso. Senão atraso = d-1.
      delay = Math.max(0, d - 1);
    } else {
      // Nunca completou: conta dias desde criação ~ aplicamos 0 inicial
      delay = 0;
    }
    if (delay !== existing.delay_days) {
      await supabase
        .from("user_stats")
        .update({ delay_days: delay, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      existing.delay_days = delay;
    }
    return existing as UserStats;
  }

  const { data: created, error } = await supabase
    .from("user_stats")
    .insert({ user_id: userId, current_streak: 0, delay_days: 0 })
    .select("*")
    .single();

  if (error) throw error;
  return created as UserStats;
}

export async function getAttemptCounts(missionId: string) {
  const { data } = await supabase
    .from("mission_attempts")
    .select("subject_code, is_correct")
    .eq("mission_id", missionId);

  const counts: Record<SubjectCode, { total: number; correct: number }> = {
    BIO: { total: 0, correct: 0 },
    QUI: { total: 0, correct: 0 },
    FIS: { total: 0, correct: 0 },
    REV: { total: 0, correct: 0 },
  };
  (data ?? []).forEach((row) => {
    const code = row.subject_code as SubjectCode;
    if (counts[code]) {
      counts[code].total++;
      if (row.is_correct) counts[code].correct++;
    }
  });
  return counts;
}

export async function completeMission(
  userId: string,
  mission: DailyMission,
  scores: { total: number; perSubject: Record<SubjectCode, number> },
) {
  const today = todayISO();
  await supabase
    .from("daily_missions")
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
      score_total: scores.total,
      score_bio: scores.perSubject.BIO,
      score_qui: scores.perSubject.QUI,
      score_fis: scores.perSubject.FIS,
      score_rev: scores.perSubject.REV,
    })
    .eq("id", mission.id);

  // Atualiza streak: se last era ontem, +1; senão = 1
  const stats = await getOrCreateStats(userId);
  let streak = 1;
  if (stats.last_completed_date) {
    const d = diffDays(stats.last_completed_date, today);
    if (d === 0) streak = stats.current_streak; // já cumpriu hoje
    else if (d === 1) streak = stats.current_streak + 1;
  }
  await supabase
    .from("user_stats")
    .update({
      current_streak: streak,
      delay_days: 0,
      last_completed_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}
