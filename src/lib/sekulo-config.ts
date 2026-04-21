// Configuração central do Sekulo.
// Para mudar a data do exame, edita aqui.
export const EXAM_DATE = new Date("2026-11-30T00:00:00");

export const SEKULO_LABEL = "SEKULO";
export const BRAND_LABEL = "JANGO+";

export function daysUntilExam(now: Date = new Date()): number {
  const ms = EXAM_DATE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function diffDays(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + "T00:00:00").getTime();
  const b = new Date(toISO + "T00:00:00").getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export type SubjectCode = "BIO" | "QUI" | "FIS" | "LP" | "REV";

export const SUBJECT_LABELS: Record<SubjectCode, string> = {
  BIO: "Biologia",
  QUI: "Química",
  FIS: "Física",
  LP: "Língua Portuguesa",
  REV: "Revisões",
};

export const DEFAULT_TARGETS: Record<SubjectCode, number> = {
  BIO: 10,
  QUI: 8,
  FIS: 8,
  LP: 8,
  REV: 4,
};
