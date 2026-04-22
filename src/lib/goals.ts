// Configuração de objetivos do aluno (Medicina, Engenharia, Outro).
// Tudo baseado em pesos — para adicionar novo objetivo, basta acrescentar uma entrada.
import type { SubjectCode } from "./sekulo-config";

export type Goal = "medicina" | "engenharia" | "outro";

export const DEFAULT_GOAL: Goal = "outro";

export function normalizeGoal(value: string | null | undefined): Goal {
  if (value === "medicina" || value === "engenharia" || value === "outro") return value;
  return DEFAULT_GOAL;
}

// Carga total diária por objetivo (nº de questões).
// Distribuída pelas disciplinas com base nos pesos abaixo.
export const TOTAL_DAILY_TARGET = 30;

export interface GoalConfig {
  label: string;
  // Pesos das disciplinas. Soma livre — normalizamos depois.
  // Disciplinas omitidas ficam fora da missão (target = 0).
  weights: Partial<Record<SubjectCode, number>>;
  // Disciplinas usadas no diagnóstico inicial (até 3).
  diagnostic: SubjectCode[];
  // Tom do Sekulo (afeta mensagens).
  voiceFlavor: "precision" | "logic" | "neutral";
}

export const GOALS: Record<Goal, GoalConfig> = {
  medicina: {
    label: "Medicina",
    weights: {
      BIO: 40,
      QUI: 30,
      FIS: 20,
      LP: 10,
    },
    diagnostic: ["BIO", "QUI", "FIS"],
    voiceFlavor: "precision",
  },
  engenharia: {
    label: "Engenharia",
    weights: {
      MAT: 40,
      FIS: 30,
      QUI: 20,
      LP: 10,
    },
    diagnostic: ["MAT", "FIS", "QUI"],
    voiceFlavor: "logic",
  },
  outro: {
    label: "Outro",
    weights: {
      BIO: 25,
      QUI: 25,
      FIS: 25,
      LP: 25,
    },
    diagnostic: ["BIO", "FIS", "LP"],
    voiceFlavor: "neutral",
  },
};

// Devolve nº de questões por disciplina, distribuídas por peso até totalizar TOTAL_DAILY_TARGET.
// Disciplinas fora dos pesos ficam com 0.
export function targetsForGoal(goal: Goal, total: number = TOTAL_DAILY_TARGET): Record<SubjectCode, number> {
  const cfg = GOALS[goal];
  const weights = cfg.weights;
  const sum = Object.values(weights).reduce((a, b) => a + (b ?? 0), 0);
  const result: Record<SubjectCode, number> = {
    BIO: 0,
    QUI: 0,
    FIS: 0,
    LP: 0,
    MAT: 0,
    REV: 0,
  };
  if (sum === 0) return result;

  // Reparte com arredondamento e garante mínimo 1 para disciplinas com peso > 0.
  let allocated = 0;
  const entries = Object.entries(weights) as [SubjectCode, number][];
  entries.forEach(([code, w], i) => {
    if (!w) return;
    const isLast = i === entries.length - 1;
    const raw = isLast ? total - allocated : Math.round((w / sum) * total);
    const value = Math.max(1, raw);
    result[code] = value;
    allocated += value;
  });

  return result;
}

// Lista ordenada de disciplinas usadas pelo objetivo (na ordem em que aparecem na missão).
export function subjectsForGoal(goal: Goal): SubjectCode[] {
  const cfg = GOALS[goal];
  return (Object.keys(cfg.weights) as SubjectCode[]).filter((c) => (cfg.weights[c] ?? 0) > 0);
}
