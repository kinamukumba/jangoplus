import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  daysUntilExam,
  SUBJECT_LABELS,
  type SubjectCode,
} from "@/lib/sekulo-config";
import {
  homeMessage,
  statusLine,
  type HomeState,
} from "@/lib/sekulo-voice";
import {
  getOrCreateStats,
  getOrCreateTodayMission,
  getAttemptCounts,
  TARGET_FIELDS,
  type DailyMission,
  type UserStats,
} from "@/lib/mission";
import { Button } from "@/components/ui/button";
import { SekuloMessage } from "@/components/sekulo/SekuloMessage";
import { Stat } from "@/components/sekulo/Stat";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/")({
  component: HomePage,
});

interface MissionState {
  mission: DailyMission;
  stats: UserStats;
  counts: Record<SubjectCode, { total: number; correct: number }>;
  totalAnswered: number;
  totalTarget: number;
  state: HomeState;
}

function HomePage() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [data, setData] = useState<MissionState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const stats = await getOrCreateStats(user.id);
      const mission = await getOrCreateTodayMission(user.id);
      const counts = await getAttemptCounts(mission.id);
      const totalAnswered =
        counts.BIO.total + counts.QUI.total + counts.FIS.total + counts.REV.total;
      const totalTarget =
        mission.bio_target + mission.qui_target + mission.fis_target + mission.rev_target;

      let state: HomeState = "not_started";
      if (mission.completed) state = "completed_today";
      else if (totalAnswered > 0) state = "in_progress";
      else if (stats.delay_days > 0) state = "failed_yesterday";

      if (active) {
        setData({ mission, stats, counts, totalAnswered, totalTarget, state });
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  if (loading || !user || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="uppercase-tight text-xs text-muted-foreground">A carregar...</div>
      </div>
    );
  }

  const days = daysUntilExam();
  const { mission, stats, counts, totalAnswered, totalTarget, state } = data;
  const progressPct = Math.round((totalAnswered / totalTarget) * 100);

  const startMission = async () => {
    setBusy(true);
    navigate({ to: "/missao" });
  };

  const subjects: SubjectCode[] = ["BIO", "QUI", "FIS", "REV"];

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-border">
        <div>
          <div className="uppercase-tight text-[10px] text-muted-foreground">JANGO+</div>
          <div className="font-display text-base font-bold">SEKULO</div>
        </div>
        <button
          onClick={() => signOut()}
          className="uppercase-tight text-[10px] text-muted-foreground hover:text-foreground"
        >
          Sair
        </button>
      </header>

      <main className="px-5 pt-6 space-y-6 max-w-md mx-auto">
        {/* Contagem regressiva */}
        <section>
          <div className="uppercase-tight text-[10px] text-muted-foreground">Faltam</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-5xl font-bold tabular-nums">{days}</span>
            <span className="text-sm text-muted-foreground">dias para o exame</span>
          </div>
          <div
            className={`mt-2 text-sm ${stats.delay_days > 0 ? "text-destructive" : "text-success"}`}
          >
            {statusLine(stats.delay_days)}
          </div>
        </section>

        {/* Mensagem do Sekulo */}
        <section className="bg-card border border-border rounded-lg p-5">
          <SekuloMessage
            tone={
              state === "failed_yesterday"
                ? "alert"
                : state === "completed_today"
                  ? "success"
                  : "neutral"
            }
          >
            {homeMessage(state)}
          </SekuloMessage>
        </section>

        {/* Stats de pressão */}
        <section className="grid grid-cols-2 gap-4 bg-card border border-border rounded-lg p-5">
          <Stat label="Sequência" value={`${stats.current_streak} dias`} tone="success" />
          <Stat
            label="Atraso"
            value={`${stats.delay_days} dias`}
            tone={stats.delay_days > 0 ? "alert" : "neutral"}
          />
        </section>

        {/* Missão do dia */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="uppercase-tight text-xs">Missão de hoje</h2>
            <span className="text-mono text-xs text-muted-foreground">
              {totalAnswered}/{totalTarget}
            </span>
          </div>

          <Progress value={progressPct} className="h-1.5 mb-4" />

          <ul className="space-y-2">
            {subjects.map((code) => {
              const target = mission[TARGET_FIELDS[code]];
              const done = counts[code].total;
              const isDone = done >= target;
              return (
                <li
                  key={code}
                  className="flex items-center justify-between bg-card border border-border rounded-md px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isDone ? "bg-success" : "bg-muted-foreground/50"
                      }`}
                    />
                    <span className="font-medium">{SUBJECT_LABELS[code]}</span>
                  </div>
                  <span className="text-mono text-sm tabular-nums text-muted-foreground">
                    {done}/{target}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* CTA */}
        <section className="pt-2">
          {mission.completed ? (
            <Button asChild variant="secondary" className="w-full h-12 uppercase-tight text-xs" disabled>
              <span>Voltar amanhã</span>
            </Button>
          ) : (
            <Button
              onClick={startMission}
              disabled={busy}
              className="w-full h-12 uppercase-tight text-xs"
            >
              {state === "in_progress" ? "Continuar missão" : "Começar missão"}
            </Button>
          )}
          {mission.completed && (
            <p className="text-center text-[11px] text-muted-foreground mt-3">
              Resultado:{" "}
              <Link to="/resultado" className="underline">
                ver avaliação
              </Link>
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
