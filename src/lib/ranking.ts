// Funções de ranking: posição atual, preview de impacto, snapshots semanais.
import { supabase } from "@/integrations/supabase/client";
import { weekStartISO, XP_RULES } from "./progression";
import {
  adjustLeagueByPercentile,
  isLeague,
  type League,
} from "./leagues";

export interface RankInfo {
  position: number; // 0 = sem posição (sem XP esta semana)
  total: number;
  weeklyXp: number;
  league: League;
  xpToNextPosition: number; // XP que faltam para alcançar quem está acima
  xpToTop10: number; // XP para entrar no top 10
}

export interface RankPreview {
  current: number;
  projected: number;
  total: number;
  delta: number; // positivo = sobe, negativo = cai (em posições)
}

export async function fetchRankInfo(userId: string): Promise<RankInfo> {
  const { data } = await supabase.rpc("get_user_rank", { _user_id: userId });
  const row = (data?.[0] ?? null) as
    | { rank_position: number; total: number; weekly_xp: number; league: string }
    | null;

  const position = row?.rank_position ?? 0;
  const total = row?.total ?? 0;
  const weeklyXp = row?.weekly_xp ?? 0;
  const league: League = isLeague(row?.league) ? row!.league as League : "bronze";

  // XP para subir uma posição (precisa do XP de quem está imediatamente acima)
  let xpToNextPosition = 0;
  if (position > 1) {
    const { data: above } = await supabase
      .from("user_stats")
      .select("weekly_xp")
      .gt("weekly_xp", weeklyXp)
      .order("weekly_xp", { ascending: true })
      .limit(1);
    if (above && above[0]) {
      xpToNextPosition = Math.max(1, above[0].weekly_xp - weeklyXp + 1);
    }
  } else if (position === 0 && total > 0) {
    // Não pontuou: precisa de pelo menos 1 XP para entrar
    xpToNextPosition = 1;
  }

  // XP para top 10
  let xpToTop10 = 0;
  if (position === 0 || position > 10) {
    const { data: tenth } = await supabase
      .from("user_stats")
      .select("weekly_xp")
      .gt("weekly_xp", 0)
      .order("weekly_xp", { ascending: false })
      .range(9, 9);
    if (tenth && tenth[0]) {
      xpToTop10 = Math.max(1, tenth[0].weekly_xp - weeklyXp + 1);
    } else {
      // Menos de 10 ativos: entrar no top 10 = ter qualquer XP
      xpToTop10 = position === 0 ? 1 : 0;
    }
  }

  return { position, total, weeklyXp, league, xpToNextPosition, xpToTop10 };
}

// Estimativa de XP que uma missão completa rende (sem bónus de sequência)
export function estimateMissionXp(): number {
  // Estimativa conservadora: missão + ~30 corretas + ~3 revisões
  return XP_RULES.MISSION_COMPLETE + 30 * XP_RULES.CORRECT_ANSWER + 3 * XP_RULES.REVIEW;
}

export async function previewMissionImpact(
  userId: string,
  additionalXp: number,
): Promise<RankPreview> {
  const { data } = await supabase.rpc("preview_rank_after_xp", {
    _user_id: userId,
    _additional_xp: additionalXp,
  });
  const row = (data?.[0] ?? null) as
    | { current_position: number; projected_position: number; total: number }
    | null;
  const current = row?.current_position ?? 0;
  const projected = row?.projected_position ?? 0;
  const total = row?.total ?? 0;
  // Delta positivo = subiu (posição menor)
  const delta = current === 0 ? 0 : current - projected;
  return { current, projected, total, delta };
}

export interface NeighborRow {
  user_id: string;
  display_name: string;
  weekly_xp: number;
  rank_position: number;
  relation: "above" | "self" | "below";
}

export async function fetchNeighbors(userId: string, radius = 2): Promise<NeighborRow[]> {
  const { data } = await supabase.rpc("get_rank_neighbors", {
    _user_id: userId,
    _radius: radius,
  });
  return (data ?? []) as NeighborRow[];
}

// Estima quantas posições o aluno cai se NÃO jogar hoje, assumindo
// que o vizinho de baixo ganha XP típico (estimateMissionXp).
export async function estimateRiskIfMissed(userId: string, weeklyXp: number): Promise<number> {
  const { data } = await supabase.rpc("get_rank_neighbors", {
    _user_id: userId,
    _radius: 4,
  });
  const rows = (data ?? []) as NeighborRow[];
  const below = rows.filter((r) => r.relation === "below");
  if (below.length === 0) return 0;
  const projection = estimateMissionXp() * 0.6; // assume vizinho faz ~60% do que tu farias
  let drops = 0;
  for (const b of below) {
    if (b.weekly_xp + projection > weeklyXp) drops++;
  }
  return drops;
}

// Lê o último snapshot do utilizador para calcular variação de posição.
export async function fetchLastSnapshot(userId: string) {
  const { data } = await supabase
    .from("rank_snapshots")
    .select("week_start_date, rank_position, weekly_xp, league")
    .eq("user_id", userId)
    .order("week_start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// Quando deteta nova semana, fecha a anterior: cria snapshot, ajusta liga.
export async function rolloverWeekIfNeeded(userId: string) {
  const currentWeek = weekStartISO();
  const { data: stats } = await supabase
    .from("user_stats")
    .select("week_start_date, weekly_xp, league")
    .eq("user_id", userId)
    .maybeSingle();

  if (!stats) return;
  if (stats.week_start_date === currentWeek) return; // mesma semana, nada a fazer

  // Apenas fecha semanas onde o utilizador efetivamente competiu
  if ((stats.weekly_xp ?? 0) > 0) {
    // Calcula posição final na semana anterior usando o snapshot estático
    // (recorremos à RPC em vez de recalcular manualmente)
    const { data: rankData } = await supabase.rpc("get_user_rank", { _user_id: userId });
    const row = (rankData?.[0] ?? null) as
      | { rank_position: number; total: number }
      | null;
    const finalPosition = row?.rank_position ?? 0;
    const total = row?.total ?? 0;
    const currentLeague: League = isLeague(stats.league) ? (stats.league as League) : "bronze";
    const adjusted = adjustLeagueByPercentile(currentLeague, finalPosition, total);

    // Snapshot (idempotente via UNIQUE)
    await supabase.from("rank_snapshots").insert({
      user_id: userId,
      week_start_date: stats.week_start_date,
      rank_position: finalPosition,
      weekly_xp: stats.weekly_xp,
      league: currentLeague,
    });

    await supabase
      .from("user_stats")
      .update({
        league: adjusted.newLeague,
        previous_week_rank: finalPosition,
        last_week_xp: stats.weekly_xp,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  }
}
