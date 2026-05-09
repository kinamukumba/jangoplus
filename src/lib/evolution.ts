// Evolução real do aluno: comparação semana atual vs anterior por disciplina.
import { supabase } from "@/integrations/supabase/client";
import type { SubjectCode } from "./sekulo-config";

export interface SubjectComparison {
  code: SubjectCode;
  prev: { total: number; correct: number; pct: number } | null;
  curr: { total: number; correct: number; pct: number } | null;
  delta: number; // pp
}

interface AttemptRow {
  subject_code: string;
  is_correct: boolean;
  answered_at: string;
}

function bucketFor(rows: AttemptRow[]) {
  const map: Record<string, { total: number; correct: number }> = {};
  rows.forEach((r) => {
    const c = r.subject_code;
    if (!map[c]) map[c] = { total: 0, correct: 0 };
    map[c].total++;
    if (r.is_correct) map[c].correct++;
  });
  return map;
}

export async function fetchEvolution(userId: string): Promise<SubjectComparison[]> {
  const now = new Date();
  const start14 = new Date(now);
  start14.setDate(start14.getDate() - 14);
  const start7 = new Date(now);
  start7.setDate(start7.getDate() - 7);

  const { data } = await supabase
    .from("mission_attempts")
    .select("subject_code, is_correct, answered_at")
    .eq("user_id", userId)
    .gte("answered_at", start14.toISOString());

  const rows = (data ?? []) as AttemptRow[];
  const prev = rows.filter((r) => new Date(r.answered_at) < start7);
  const curr = rows.filter((r) => new Date(r.answered_at) >= start7);
  const prevB = bucketFor(prev);
  const currB = bucketFor(curr);

  const codes = Array.from(new Set([...Object.keys(prevB), ...Object.keys(currB)])) as SubjectCode[];

  return codes.map((code) => {
    const p = prevB[code];
    const c = currB[code];
    const pPct = p && p.total > 0 ? Math.round((p.correct / p.total) * 100) : null;
    const cPct = c && c.total > 0 ? Math.round((c.correct / c.total) * 100) : null;
    return {
      code,
      prev: p ? { ...p, pct: pPct ?? 0 } : null,
      curr: c ? { ...c, pct: cPct ?? 0 } : null,
      delta: (cPct ?? 0) - (pPct ?? 0),
    };
  });
}

// Disciplina com maior melhoria nesta semana (para Sekulo).
export function pickImprovement(items: SubjectComparison[]): SubjectComparison | null {
  const candidates = items.filter((i) => i.prev && i.curr && i.delta >= 15);
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.delta - a.delta)[0];
}

export function pickDecline(items: SubjectComparison[]): SubjectComparison | null {
  const candidates = items.filter((i) => i.prev && i.curr && i.delta <= -10);
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => a.delta - b.delta)[0];
}
