// Probabilidade de aprovação baseada nos últimos simulados.
// Sem ML — média ponderada simples (peso decrescente).
import { supabase } from "@/integrations/supabase/client";

export type ApprovalTier = "strong" | "risk" | "critical";

export interface ApprovalResult {
  tier: ApprovalTier;
  score: number;        // 0-100
  simulados: number;    // nº usado no cálculo
  label: string;
}

const WEIGHTS = [0.35, 0.25, 0.18, 0.12, 0.10]; // somam 1, mais peso nos recentes

export async function approvalProbability(userId: string): Promise<ApprovalResult | null> {
  const { data } = await supabase
    .from("exam_attempts")
    .select("score, finished_at")
    .eq("user_id", userId)
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(5);

  const rows = (data ?? []) as { score: number }[];
  if (rows.length < 2) return null;

  const used = rows.slice(0, Math.min(5, rows.length));
  const w = WEIGHTS.slice(0, used.length);
  const wSum = w.reduce((s, v) => s + v, 0);
  const score = Math.round(used.reduce((s, r, i) => s + r.score * w[i], 0) / wSum);

  let tier: ApprovalTier;
  let label: string;
  if (score >= 70) {
    tier = "strong";
    label = "Forte";
  } else if (score >= 50) {
    tier = "risk";
    label = "Em risco";
  } else {
    tier = "critical";
    label = "Crítico";
  }
  return { tier, score, simulados: used.length, label };
}
