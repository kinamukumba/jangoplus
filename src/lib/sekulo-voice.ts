// Mensagens duras do Sekulo. Sem motivação vazia.
// Cada situação tem 1-3 variantes; escolhemos uma de forma estável (sem aleatoriedade entre renders).
import type { SubjectCode } from "./sekulo-config";

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function dayHash(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export type HomeState =
  | "not_started"
  | "in_progress"
  | "completed_today"
  | "failed_yesterday";

export function homeMessage(state: HomeState): string {
  const seed = dayHash();
  switch (state) {
    case "not_started":
      return pick(
        [
          "Ainda não começaste. Estás a perder tempo.",
          "O dia já anda. Tu não.",
          "Não há motivação. Há trabalho. Começa.",
        ],
        seed,
      );
    case "in_progress":
      return pick(
        [
          "Continua. Ainda não acabaste.",
          "Não pares no meio. Termina.",
          "Faltam questões. Volta ao trabalho.",
        ],
        seed,
      );
    case "completed_today":
      return pick(
        [
          "Missão de hoje cumprida. Volta amanhã.",
          "Hoje fizeste o mínimo. Amanhã, repete.",
        ],
        seed,
      );
    case "failed_yesterday":
      return pick(
        [
          "Falhaste ontem. Não repitas hoje.",
          "Ontem não cumpriste. Hoje não negoceias.",
          "Atrasaste-te. O exame não espera.",
        ],
        seed,
      );
  }
}

export function correctMessage(seed: number): string {
  return pick(
    [
      "Correto. Mantém o nível.",
      "Acertaste. Próxima.",
      "Bem. Não te acomodes.",
    ],
    seed,
  );
}

export function wrongMessage(seed: number): string {
  return pick(
    [
      "Errado. Isto vai sair no exame.",
      "Falhaste. Lê a explicação.",
      "Erro. Não podes errar isto no dia.",
    ],
    seed,
  );
}

export function resultMessage(percent: number): string {
  if (percent >= 80) return "Estás no caminho certo.";
  if (percent >= 60) return "Aceitável. Não chega.";
  if (percent >= 40) return "Insuficiente. Precisas melhorar.";
  return "A este ritmo, não passas.";
}

export function delayMessage(delay: number): string | null {
  if (delay <= 0) return null;
  if (delay === 1) return "Estás 1 dia atrasado.";
  return `Estás ${delay} dias atrasado.`;
}

export function statusLine(delay: number): string {
  if (delay <= 0) return "Estás dentro do plano.";
  if (delay === 1) return "Estás 1 dia atrasado.";
  return `Estás ${delay} dias atrasado.`;
}

export function levelUpMessage(level: number): string {
  return `Subiste para nível ${level}. Mantém consistência.`;
}

export function streakLostMessage(): string {
  return "Perdeste a sequência. Recomeça.";
}

export function streakBonusMessage(days: number): string {
  if (days >= 7) return "7 dias seguidos. Não percas o ritmo.";
  if (days >= 3) return "3 dias seguidos. Continua.";
  return `${days} dias seguidos.`;
}

export function rankMessage(position: number | null, total: number): string {
  if (!position) return "Ainda não apareces no ranking. Trabalha.";
  if (position <= 3) return "Estás entre os melhores. Não afrouxes.";
  if (position <= 10) return "Estás no top. Sobe mais.";
  const pct = total > 0 ? position / total : 1;
  if (pct <= 0.5) return "Estás no meio da tabela. Podes mais.";
  return "Estás abaixo do nível necessário.";
}

export const SUBJECT_ORDER: SubjectCode[] = ["BIO", "QUI", "FIS", "REV"];
