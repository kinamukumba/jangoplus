// Sistema de ligas: Bronze → Prata → Ouro → Elite
// Promoção/despromoção semanal por percentil dentro do leaderboard.

export type League = "bronze" | "prata" | "ouro" | "elite";

export const LEAGUE_ORDER: League[] = ["bronze", "prata", "ouro", "elite"];

export const LEAGUE_LABELS: Record<League, string> = {
  bronze: "Bronze",
  prata: "Prata",
  ouro: "Ouro",
  elite: "Elite",
};

// Cores em tokens semânticos: usadas com style inline ou classe via getLeagueColor.
export const LEAGUE_COLORS: Record<League, string> = {
  bronze: "oklch(0.55 0.10 50)",
  prata: "oklch(0.78 0.02 250)",
  ouro: "oklch(0.78 0.15 90)",
  elite: "oklch(0.65 0.20 290)",
};

export function isLeague(value: string | null | undefined): value is League {
  return value === "bronze" || value === "prata" || value === "ouro" || value === "elite";
}

export function nextLeague(current: League): League | null {
  const i = LEAGUE_ORDER.indexOf(current);
  return i >= 0 && i < LEAGUE_ORDER.length - 1 ? LEAGUE_ORDER[i + 1] : null;
}

export function prevLeague(current: League): League | null {
  const i = LEAGUE_ORDER.indexOf(current);
  return i > 0 ? LEAGUE_ORDER[i - 1] : null;
}

// Top 20% sobe, últimos 20% descem. Aplicado pelo cliente quando deteta nova semana.
export function adjustLeagueByPercentile(
  current: League,
  position: number,
  total: number,
): { newLeague: League; direction: "up" | "down" | "stay" } {
  if (total < 5 || position <= 0) return { newLeague: current, direction: "stay" };
  const pct = position / total;
  if (pct <= 0.2) {
    const up = nextLeague(current);
    if (up) return { newLeague: up, direction: "up" };
  } else if (pct > 0.8) {
    const down = prevLeague(current);
    if (down) return { newLeague: down, direction: "down" };
  }
  return { newLeague: current, direction: "stay" };
}

export function leagueMessage(direction: "up" | "down" | "stay", league: League): string {
  if (direction === "up") return `Subiste para ${LEAGUE_LABELS[league]}. Mantém o nível.`;
  if (direction === "down") return `Desceste para ${LEAGUE_LABELS[league]}. Recupera.`;
  return `Continuas na ${LEAGUE_LABELS[league]}.`;
}
