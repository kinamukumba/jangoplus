// Carrega/cria a missão diária e calcula sequência + atraso.
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TARGETS, diffDays, todayISO, type SubjectCode } from "./sekulo-config";
import { XP_RULES, levelForXp, weekStartISO, type XPKind } from "./progression";
import { normalizeGoal, targetsForGoal, type Goal } from "./goals";

export interface DailyMission {
  id: string;
  user_id: string;
  mission_date: string;
  bio_target: number;
  qui_target: number;
  fis_target: number;
  lp_target: number;
  mat_target: number;
  rev_target: number;
  completed: boolean;
  completed_at: string | null;
  score_total: number | null;
  score_bio: number | null;
  score_qui: number | null;
  score_fis: number | null;
  score_lp: number | null;
  score_mat: number | null;
  score_rev: number | null;
}

export interface UserStats {
  user_id: string;
  current_streak: number;
  delay_days: number;
  last_completed_date: string | null;
  xp_total: number;
  level: number;
  weekly_xp: number;
  weekly_missions: number;
  week_start_date: string;
}

export const TARGET_FIELDS: Record<SubjectCode, keyof Pick<DailyMission, "bio_target" | "qui_target" | "fis_target" | "lp_target" | "mat_target" | "rev_target">> = {
  BIO: "bio_target",
  QUI: "qui_target",
  FIS: "fis_target",
  LP: "lp_target",
  MAT: "mat_target",
  REV: "rev_target",
};

export const SCORE_FIELDS: Record<SubjectCode, keyof Pick<DailyMission, "score_bio" | "score_qui" | "score_fis" | "score_lp" | "score_mat" | "score_rev">> = {
  BIO: "score_bio",
  QUI: "score_qui",
  FIS: "score_fis",
  LP: "score_lp",
  MAT: "score_mat",
  REV: "score_rev",
};

async function fetchUserGoal(userId: string): Promise<Goal> {
  const { data } = await supabase
    .from("profiles")
    .select("goal")
    .eq("id", userId)
    .maybeSingle();
  return normalizeGoal(data?.goal ?? null);
}

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

  // 2. Calcula consequência: aumenta carga se atrasado (+15% por dia, até +3 dias)
  const stats = await getOrCreateStats(userId);
  const extraLoadPct = Math.min(stats.delay_days, 3) * 0.15;
  const bump = (base: number) => (base > 0 ? Math.max(1, Math.round(base * (1 + extraLoadPct))) : 0);

  // 3. Distribui questões por disciplina conforme objetivo do aluno (pesos).
  const goal = await fetchUserGoal(userId);
  const targets = targetsForGoal(goal);

  const { data: created, error } = await supabase
    .from("daily_missions")
    .insert({
      user_id: userId,
      mission_date: today,
      bio_target: bump(targets.BIO ?? DEFAULT_TARGETS.BIO),
      qui_target: bump(targets.QUI ?? DEFAULT_TARGETS.QUI),
      fis_target: bump(targets.FIS ?? DEFAULT_TARGETS.FIS),
      lp_target: bump(targets.LP ?? DEFAULT_TARGETS.LP),
      mat_target: bump(targets.MAT ?? 0),
      rev_target: bump(targets.REV ?? 0),
    })
    .select("*")
    .single();

  if (error) throw error;
  return created as DailyMission;
}

export async function getOrCreateStats(userId: string): Promise<UserStats> {
  const currentWeek = weekStartISO();
  const { data: existing } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const today = todayISO();
    const lastDate = existing.last_completed_date;
    let delay = 0;
    let streak = existing.current_streak;
    let streakReset = false;

    if (lastDate) {
      const d = diffDays(lastDate, today);
      delay = Math.max(0, d - 1);
      // Se passou mais de 1 dia sem cumprir, reset da sequência e penalização por falhar
      if (d > 1 && streak > 0) {
        streak = 0;
        streakReset = true;
      }
    }

    type StatsPatch = Partial<{
      delay_days: number;
      current_streak: number;
      week_start_date: string;
      weekly_xp: number;
      weekly_missions: number;
      updated_at: string;
    }>;
    const patch: StatsPatch = {};
    if (delay !== existing.delay_days) patch.delay_days = delay;
    if (streakReset) patch.current_streak = 0;

    // Reset semanal
    if (existing.week_start_date !== currentWeek) {
      patch.week_start_date = currentWeek;
      patch.weekly_xp = 0;
      patch.weekly_missions = 0;
    }

    if (Object.keys(patch).length > 0) {
      patch.updated_at = new Date().toISOString();
      await supabase.from("user_stats").update(patch).eq("user_id", userId);
      Object.assign(existing, patch);
    }

    // Penalização registada apenas uma vez (quando sequência foi perdida agora)
    if (streakReset) {
      await awardXp(userId, null, "mission_failed", XP_RULES.MISSION_FAILED);
      // refresh total after penalty
      const { data: refreshed } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (refreshed) Object.assign(existing, refreshed);
    }

    return existing as UserStats;
  }

  const { data: created, error } = await supabase
    .from("user_stats")
    .insert({
      user_id: userId,
      current_streak: 0,
      delay_days: 0,
      xp_total: 0,
      level: 1,
      weekly_xp: 0,
      weekly_missions: 0,
      week_start_date: currentWeek,
    })
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
    LP: { total: 0, correct: 0 },
    MAT: { total: 0, correct: 0 },
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

// Regista evento de XP e atualiza user_stats (xp_total, level, weekly_xp).
export async function awardXp(
  userId: string,
  missionId: string | null,
  kind: XPKind,
  amount: number,
) {
  if (amount === 0) return;
  await supabase.from("xp_events").insert({
    user_id: userId,
    mission_id: missionId,
    kind,
    amount,
  });

  // Lê totais atuais e recalcula
  const currentWeek = weekStartISO();
  const { data: stats } = await supabase
    .from("user_stats")
    .select("xp_total, weekly_xp, week_start_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (!stats) return;

  const newXpTotal = Math.max(0, (stats.xp_total ?? 0) + amount);
  const sameWeek = stats.week_start_date === currentWeek;
  const newWeeklyXp = Math.max(0, sameWeek ? (stats.weekly_xp ?? 0) + amount : Math.max(0, amount));

  await supabase
    .from("user_stats")
    .update({
      xp_total: newXpTotal,
      level: levelForXp(newXpTotal),
      weekly_xp: newWeeklyXp,
      week_start_date: currentWeek,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

export interface MissionCompletionResult {
  xpAwarded: number;
  breakdown: {
    base: number;
    correct: number;
    reviews: number;
    streakBonus: number;
  };
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  newStreak: number;
  streakBonusKind: "streak_3" | "streak_7" | null;
}

export async function completeMission(
  userId: string,
  mission: DailyMission,
  scores: { total: number; perSubject: Record<SubjectCode, number> },
  counts: Record<SubjectCode, { total: number; correct: number }>,
): Promise<MissionCompletionResult> {
  const today = todayISO();

  // 1. Marca missão como concluída
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

  // 2. Idempotência: se já premiámos esta missão, devolve resumo
  const { data: existingEvents } = await supabase
    .from("xp_events")
    .select("kind, amount")
    .eq("mission_id", mission.id);

  const stats = await getOrCreateStats(userId);
  const previousLevel = stats.level;

  // Calcula nova streak
  let newStreak = 1;
  if (stats.last_completed_date) {
    const d = diffDays(stats.last_completed_date, today);
    if (d === 0) newStreak = stats.current_streak;
    else if (d === 1) newStreak = stats.current_streak + 1;
  }

  if (existingEvents && existingEvents.length > 0) {
    // Já processada — retorna resumo do que foi atribuído
    const base = existingEvents.find((e) => e.kind === "mission_complete")?.amount ?? 0;
    const correct = existingEvents.filter((e) => e.kind === "correct_answer").reduce((s, e) => s + e.amount, 0);
    const reviews = existingEvents.filter((e) => e.kind === "review").reduce((s, e) => s + e.amount, 0);
    const s3 = existingEvents.find((e) => e.kind === "streak_3")?.amount ?? 0;
    const s7 = existingEvents.find((e) => e.kind === "streak_7")?.amount ?? 0;
    const streakBonus = s3 + s7;
    return {
      xpAwarded: base + correct + reviews + streakBonus,
      breakdown: { base, correct, reviews, streakBonus },
      previousLevel,
      newLevel: stats.level,
      leveledUp: false,
      newStreak: stats.current_streak,
      streakBonusKind: s7 ? "streak_7" : s3 ? "streak_3" : null,
    };
  }

  // 3. Calcula XP a atribuir
  const correctTotal = counts.BIO.correct + counts.QUI.correct + counts.FIS.correct + counts.LP.correct;
  const reviewCorrect = counts.REV.correct;

  const baseXp = XP_RULES.MISSION_COMPLETE;
  const correctXp = correctTotal * XP_RULES.CORRECT_ANSWER;
  const reviewXp = reviewCorrect * XP_RULES.REVIEW;

  let streakBonusKind: "streak_3" | "streak_7" | null = null;
  let streakBonus = 0;
  // Bónus dado apenas quando atinge o marco (evita duplicação em dias consecutivos acima do marco)
  if (newStreak === 7) {
    streakBonus = XP_RULES.STREAK_7;
    streakBonusKind = "streak_7";
  } else if (newStreak === 3) {
    streakBonus = XP_RULES.STREAK_3;
    streakBonusKind = "streak_3";
  }

  // 4. Regista eventos individuais
  if (baseXp) await awardXp(userId, mission.id, "mission_complete", baseXp);
  if (correctXp) await awardXp(userId, mission.id, "correct_answer", correctXp);
  if (reviewXp) await awardXp(userId, mission.id, "review", reviewXp);
  if (streakBonus && streakBonusKind) {
    await awardXp(userId, mission.id, streakBonusKind, streakBonus);
  }

  // 5. Atualiza stats (streak, delay, weekly_missions)
  const { data: refreshed } = await supabase
    .from("user_stats")
    .select("weekly_missions, week_start_date, xp_total")
    .eq("user_id", userId)
    .maybeSingle();

  const currentWeek = weekStartISO();
  const sameWeek = refreshed?.week_start_date === currentWeek;
  const newWeeklyMissions = (sameWeek ? refreshed?.weekly_missions ?? 0 : 0) + 1;

  await supabase
    .from("user_stats")
    .update({
      current_streak: newStreak,
      delay_days: 0,
      last_completed_date: today,
      weekly_missions: newWeeklyMissions,
      week_start_date: currentWeek,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  const newXpTotal = refreshed?.xp_total ?? 0;
  const newLevel = levelForXp(newXpTotal);

  return {
    xpAwarded: baseXp + correctXp + reviewXp + streakBonus,
    breakdown: { base: baseXp, correct: correctXp, reviews: reviewXp, streakBonus },
    previousLevel,
    newLevel,
    leveledUp: newLevel > previousLevel,
    newStreak,
    streakBonusKind,
  };
}
