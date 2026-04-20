// Sistema de progressão do Sekulo: XP, níveis, sequência, bónus e penalizações.
// Regra de ouro: XP só vem de ações reais (questão respondida, missão concluída).

export const XP_RULES = {
  MISSION_COMPLETE: 100,
  CORRECT_ANSWER: 2,
  REVIEW: 3, // extra por cada revisão (REV) correta
  STREAK_3: 50,
  STREAK_7: 150,
  MISSION_FAILED: -50,
} as const;

export type XPKind =
  | "mission_complete"
  | "correct_answer"
  | "review"
  | "streak_3"
  | "streak_7"
  | "mission_failed";

// Curva de níveis simples e previsível.
// Nível 1: 0-499, Nível 2: 500-1199, Nível 3: 1200-2499, Nível 4+: +1500 por nível
const LEVEL_THRESHOLDS = [0, 500, 1200, 2500];
const LINEAR_STEP = 1500;

export function levelForXp(xp: number): number {
  if (xp < LEVEL_THRESHOLDS[1]) return 1;
  if (xp < LEVEL_THRESHOLDS[2]) return 2;
  if (xp < LEVEL_THRESHOLDS[3]) return 3;
  return 3 + Math.floor((xp - LEVEL_THRESHOLDS[3]) / LINEAR_STEP) + 1;
}

export function xpForLevelStart(level: number): number {
  if (level <= 1) return 0;
  if (level === 2) return LEVEL_THRESHOLDS[1];
  if (level === 3) return LEVEL_THRESHOLDS[2];
  if (level === 4) return LEVEL_THRESHOLDS[3];
  return LEVEL_THRESHOLDS[3] + (level - 4) * LINEAR_STEP;
}

export function xpForNextLevel(level: number): number {
  return xpForLevelStart(level + 1);
}

export interface LevelProgress {
  level: number;
  currentXp: number;
  floor: number;
  ceiling: number;
  percent: number; // 0-100 dentro do nível
  toNext: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const floor = xpForLevelStart(level);
  const ceiling = xpForNextLevel(level);
  const span = Math.max(1, ceiling - floor);
  const inLevel = Math.max(0, xp - floor);
  return {
    level,
    currentXp: xp,
    floor,
    ceiling,
    percent: Math.min(100, Math.round((inLevel / span) * 100)),
    toNext: Math.max(0, ceiling - xp),
  };
}

// Segunda-feira da semana (ISO) como string YYYY-MM-DD.
export function weekStartISO(now: Date = new Date()): string {
  const d = new Date(now);
  const day = d.getDay(); // 0 = domingo
  const diff = (day === 0 ? -6 : 1 - day); // mover para segunda
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
