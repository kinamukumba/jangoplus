import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { rankMessage } from "@/lib/sekulo-voice";
import { SekuloMessage } from "@/components/sekulo/SekuloMessage";
import { Stat } from "@/components/sekulo/Stat";
import { XPBar } from "@/components/sekulo/XPBar";
import { Button } from "@/components/ui/button";
import { levelProgress } from "@/lib/progression";
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
}

function RankingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<RankRow[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [myXpTotal, setMyXpTotal] = useState<number>(0);
  const [myStreak, setMyStreak] = useState<number>(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: board, count } = await supabase
        .from("weekly_leaderboard")
        .select("user_id, display_name, weekly_xp, weekly_missions, current_streak, level", {
          count: "exact",
        })
        .order("weekly_xp", { ascending: false })
        .order("weekly_missions", { ascending: false })
        .limit(10);
      const list = (board ?? []) as RankRow[];
      setRows(list);
      setTotalCount(count ?? list.length);

      // Posição do utilizador (pode estar fora do top 10)
      const idx = list.findIndex((r) => r.user_id === user.id);
      if (idx >= 0) {
        setMyPosition(idx + 1);
      } else {
        // Procura o XP do utilizador para calcular posição real
        const { data: me } = await supabase
          .from("user_stats")
          .select("weekly_xp")
          .eq("user_id", user.id)
          .maybeSingle();
        if (me) {
          const { count: better } = await supabase
            .from("weekly_leaderboard")
            .select("user_id", { count: "exact", head: true })
            .gt("weekly_xp", me.weekly_xp);
          setMyPosition((better ?? 0) + 1);
        }
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

  if (loading || !user || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="uppercase-tight text-xs text-muted-foreground">A carregar...</div>
      </div>
    );
  }

  const progress = levelProgress(myXpTotal);

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
        {/* Progresso pessoal */}
        <section className="bg-card border border-border rounded-lg p-5">
          <XPBar progress={progress} />
        </section>

        <section className="grid grid-cols-2 gap-4 bg-card border border-border rounded-lg p-5">
          <Stat label="Sequência" value={`${myStreak} dias`} tone="success" />
          <Stat
            label="Posição"
            value={myPosition ? `#${myPosition}` : "—"}
            tone={myPosition && myPosition <= 10 ? "success" : "neutral"}
          />
        </section>

        <section className="bg-card border border-border rounded-lg p-5">
          <SekuloMessage tone={myPosition && myPosition <= 10 ? "success" : "alert"}>
            {rankMessage(myPosition, totalCount)}
          </SekuloMessage>
        </section>

        {/* Top 10 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="uppercase-tight text-xs">Top 10 da semana</h2>
            <span className="text-mono text-[10px] text-muted-foreground">{totalCount} ativos</span>
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Ninguém ainda. Sê o primeiro.
            </div>
          ) : (
            <ul className="space-y-2">
              {rows.map((row, i) => {
                const isMe = row.user_id === user.id;
                const position = i + 1;
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
                      <div className="font-medium truncate">
                        {row.display_name}
                        {isMe && <span className="ml-2 uppercase-tight text-[10px] opacity-70">Tu</span>}
                      </div>
                      <div
                        className={cn(
                          "uppercase-tight text-[10px]",
                          isMe ? "opacity-70" : "text-muted-foreground",
                        )}
                      >
                        {row.weekly_missions} missões · {row.current_streak} dias
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
