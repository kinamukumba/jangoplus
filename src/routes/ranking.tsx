import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { rankMessage, rankDeltaMessage } from "@/lib/sekulo-voice";
import { SekuloMessage } from "@/components/sekulo/SekuloMessage";
import { Stat } from "@/components/sekulo/Stat";
import { XPBar } from "@/components/sekulo/XPBar";
import { LeagueBadge } from "@/components/sekulo/LeagueBadge";
import { DeltaBadge } from "@/components/sekulo/DeltaBadge";
import { Button } from "@/components/ui/button";
import { levelProgress } from "@/lib/progression";
import { fetchRankInfo, fetchLastSnapshot, type RankInfo } from "@/lib/ranking";
import { isLeague, LEAGUE_LABELS, type League } from "@/lib/leagues";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ranking")({
  component: RankingPage,
});

interface RankRow {
  user_id: string;
  display_name: string;
  weekly_xp: number;
  weekly_missions: number;
  current_streak: number;
  level: number;
  league: string | null;
}

function RankingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<RankRow[]>([]);
  const [rank, setRank] = useState<RankInfo | null>(null);
  const [delta, setDelta] = useState<number>(0);
  const [myXpTotal, setMyXpTotal] = useState<number>(0);
  const [myStreak, setMyStreak] = useState<number>(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Top 10 da semana
      const { data: board } = await supabase
        .from("weekly_leaderboard")
        .select("user_id, display_name, weekly_xp, weekly_missions, current_streak, level, league")
        .order("weekly_xp", { ascending: false })
        .order("weekly_missions", { ascending: false })
        .limit(10);
      setRows((board ?? []) as RankRow[]);

      // Posição & liga atuais
      const info = await fetchRankInfo(user.id);
      setRank(info);

      // Variação face ao último snapshot
      const snap = await fetchLastSnapshot(user.id);
      if (snap && info.position > 0) {
        // Delta positivo = subiu (posição menor agora)
        setDelta(snap.rank_position - info.position);
      } else {
        setDelta(0);
      }

      const { data: stats } = await supabase
        .from("user_stats")
        .select("xp_total, current_streak")
        .eq("user_id", user.id)
        .maybeSingle();
      if (stats) {
        setMyXpTotal(stats.xp_total);
        setMyStreak(stats.current_streak);
      }
      setReady(true);
    })();
  }, [user]);

  if (loading || !user || !ready || !rank) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="uppercase-tight text-xs text-muted-foreground">A carregar...</div>
      </div>
    );
  }

  const progress = levelProgress(myXpTotal);
  const inTop10 = rank.position > 0 && rank.position <= 10;

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="px-5 pt-6 pb-4 border-b border-border flex items-center justify-between">
        <div>
          <div className="uppercase-tight text-[10px] text-muted-foreground">Ranking semanal</div>
          <h1 className="font-display text-xl font-bold mt-1">Competição</h1>
        </div>
        <Link to="/" className="uppercase-tight text-[10px] text-muted-foreground hover:text-foreground">
          Voltar
        </Link>
      </header>

      <main className="px-5 pt-6 space-y-6 max-w-md mx-auto">
        {/* Hero: posição + liga + variação */}
        <section className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="uppercase-tight text-[10px] text-muted-foreground">A tua posição</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-6xl font-bold tabular-nums">
                  {rank.position > 0 ? `#${rank.position}` : "—"}
                </span>
                {rank.total > 0 && (
                  <span className="text-mono text-sm text-muted-foreground">
                    de {rank.total}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <DeltaBadge delta={delta} />
              </div>
            </div>
            <LeagueBadge league={rank.league} size="lg" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <div className="uppercase-tight text-[10px] text-muted-foreground">Sobe 1 posição</div>
              <div className="font-display text-lg font-bold mt-1 tabular-nums">
                {rank.xpToNextPosition > 0 ? `+${rank.xpToNextPosition} XP` : "—"}
              </div>
            </div>
            <div>
              <div className="uppercase-tight text-[10px] text-muted-foreground">Para top 10</div>
              <div className="font-display text-lg font-bold mt-1 tabular-nums">
                {inTop10 ? "Já lá estás" : rank.xpToTop10 > 0 ? `+${rank.xpToTop10} XP` : "—"}
              </div>
            </div>
          </div>
        </section>

        {/* Mensagem do Sekulo */}
        <section className="bg-card border border-border rounded-lg p-5">
          <SekuloMessage tone={inTop10 ? "success" : delta < 0 ? "alert" : "neutral"}>
            {delta !== 0 ? rankDeltaMessage(delta) : rankMessage(rank.position || null, rank.total)}
          </SekuloMessage>
        </section>

        {/* Stats pessoais */}
        <section className="grid grid-cols-2 gap-4 bg-card border border-border rounded-lg p-5">
          <Stat label="Sequência" value={`${myStreak} dias`} tone="success" />
          <Stat
            label="XP semana"
            value={rank.weeklyXp}
            tone={rank.weeklyXp > 0 ? "success" : "neutral"}
          />
        </section>

        {/* Progresso XP total */}
        <section className="bg-card border border-border rounded-lg p-5">
          <XPBar progress={progress} />
        </section>

        {/* Sistema de ligas */}
        <section className="bg-card border border-border rounded-lg p-5">
          <div className="uppercase-tight text-[10px] text-muted-foreground mb-3">
            Promoção semanal
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Top 20% sobe de liga. Últimos 20% descem. Nova semana, nova batalha.
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {(["bronze", "prata", "ouro", "elite"] as League[]).map((lg) => (
              <span
                key={lg}
                className={cn(
                  "px-2 py-1 rounded border text-[10px] uppercase-tight",
                  rank.league === lg
                    ? "border-foreground bg-foreground text-background font-semibold"
                    : "border-border text-muted-foreground",
                )}
              >
                {LEAGUE_LABELS[lg]}
              </span>
            ))}
          </div>
        </section>

        {/* Top 10 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="uppercase-tight text-xs">Top 10 da semana</h2>
            <span className="text-mono text-[10px] text-muted-foreground">
              {rank.total} ativos
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-md">
              Ninguém pontuou ainda. Sê o primeiro.
            </div>
          ) : (
            <ul className="space-y-2">
              {rows.map((row, i) => {
                const isMe = row.user_id === user.id;
                const position = i + 1;
                const rowLeague: League = isLeague(row.league) ? (row.league as League) : "bronze";
                return (
                  <li
                    key={row.user_id}
                    className={cn(
                      "flex items-center gap-3 border rounded-md px-4 py-3",
                      isMe
                        ? "bg-foreground text-background border-foreground"
                        : "bg-card border-border",
                    )}
                  >
                    <span className="font-display text-lg font-bold tabular-nums w-8">
                      {position}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        <span className="truncate">{row.display_name}</span>
                        {isMe && (
                          <span className="uppercase-tight text-[10px] opacity-70 shrink-0">
                            Tu
                          </span>
                        )}
                      </div>
                      <div
                        className={cn(
                          "uppercase-tight text-[10px] mt-0.5",
                          isMe ? "opacity-70" : "text-muted-foreground",
                        )}
                      >
                        {LEAGUE_LABELS[rowLeague]} · {row.weekly_missions} missões · {row.current_streak} dias
                      </div>
                    </div>
                    <span className="text-mono text-sm tabular-nums font-semibold">
                      {row.weekly_xp} XP
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="pt-2">
          <Button asChild variant="secondary" className="w-full h-12 uppercase-tight text-xs">
            <Link to="/">Voltar à missão</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
