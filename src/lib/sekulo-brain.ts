// Mentor reativo: escolhe a frase mais urgente com base no estado atual do aluno.
// Sem motivação vazia. Cada frase termina em ação ou diagnóstico.
import { SUBJECT_LABELS, type SubjectCode } from "./sekulo-config";

export interface SekuloContext {
  delayDays: number;            // dias sem cumprir
  streak: number;               // sequência atual
  rankDelta: number;            // posições ganhas (+) ou perdidas (-) vs último snapshot
  position: number;             // posição atual (0 = sem ranking)
  inTop10: boolean;
  leagueChanged: "up" | "down" | null;
  // Subiu de patamar (>=15pp em 7 dias) por disciplina
  improvedSubject: SubjectCode | null;
  // Caiu de patamar (>=10pp em 7 dias) por disciplina
  decliningSubject: SubjectCode | null;
  missionCompleted: boolean;    // já terminou hoje?
  inProgress: boolean;          // começou e não terminou?
}

export interface SekuloLine {
  text: string;
  tone: "neutral" | "alert" | "success";
  reason: string;               // chave para debug
}

export function pickContextualMessage(ctx: SekuloContext): SekuloLine {
  // 1) abandono
  if (ctx.delayDays >= 3) {
    return {
      text: `${ctx.delayDays} dias perdido. Os outros continuam.`,
      tone: "alert",
      reason: "abandon",
    };
  }
  // 2) queda de ranking
  if (ctx.rankDelta <= -2) {
    return {
      text: `Caíste ${Math.abs(ctx.rankDelta)} posições. Recupera hoje.`,
      tone: "alert",
      reason: "rank_down",
    };
  }
  // 3) despromoção de liga
  if (ctx.leagueChanged === "down") {
    return { text: "Desceste de liga. Volta ao trabalho.", tone: "alert", reason: "league_down" };
  }
  // 4) promoção / top 10
  if (ctx.leagueChanged === "up") {
    return { text: "Subiste de liga. Agora sustenta.", tone: "success", reason: "league_up" };
  }
  if (ctx.inTop10 && ctx.rankDelta > 0) {
    return { text: "Estás no top 10. Não saias daí.", tone: "success", reason: "top10" };
  }
  // 5) disciplina caindo
  if (ctx.decliningSubject) {
    return {
      text: `Estás a perder consistência em ${SUBJECT_LABELS[ctx.decliningSubject]}.`,
      tone: "alert",
      reason: "subject_down",
    };
  }
  // 6) disciplina melhorando
  if (ctx.improvedSubject) {
    return {
      text: `${SUBJECT_LABELS[ctx.improvedSubject]} deixou de ser teu problema.`,
      tone: "success",
      reason: "subject_up",
    };
  }
  // 7) streak
  if (ctx.streak >= 7) {
    return { text: `${ctx.streak} dias seguidos. Não percas o ritmo.`, tone: "success", reason: "streak_7" };
  }
  if (ctx.streak >= 3) {
    return { text: `${ctx.streak} dias seguidos. Continua.`, tone: "success", reason: "streak_3" };
  }
  // 8) estado da missão de hoje
  if (ctx.missionCompleted) {
    return { text: "Missão de hoje cumprida. Volta amanhã.", tone: "success", reason: "done" };
  }
  if (ctx.inProgress) {
    return { text: "Não pares no meio. Termina.", tone: "neutral", reason: "in_progress" };
  }
  if (ctx.delayDays === 1) {
    return { text: "Falhaste ontem. Não repitas hoje.", tone: "alert", reason: "delay_1" };
  }
  return { text: "Ainda não começaste. Estás a perder tempo.", tone: "neutral", reason: "default" };
}
