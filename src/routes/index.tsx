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
  preMissionMessage,
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
import {
  fetchRankInfo,
  previewMissionImpact,
  estimateMissionXp,
  rolloverWeekIfNeeded,
  fetchNeighbors,
  fetchLastSnapshot,
  estimateRiskIfMissed,
  type RankInfo,
  type RankPreview,
  type NeighborRow,
} from "@/lib/ranking";
import { Button } from "@/components/ui/button";
import { SekuloMessage } from "@/components/sekulo/SekuloMessage";
import { Stat } from "@/components/sekulo/Stat";
import { XPBar } from "@/components/sekulo/XPBar";
import { LeagueBadge } from "@/components/sekulo/LeagueBadge";
import { NeighborStrip } from "@/components/sekulo/NeighborStrip";
import { UrgencyBanner } from "@/components/sekulo/UrgencyBanner";
import { ApprovalGauge } from "@/components/sekulo/ApprovalGauge";
import { Progress } from "@/components/ui/progress";
import { levelProgress } from "@/lib/progression";
import { pickContextualMessage } from "@/lib/sekulo-brain";
import { fetchEvolution, pickImprovement, pickDecline } from "@/lib/evolution";
import { approvalProbability, type ApprovalResult } from "@/lib/approval";
import { isLeague } from "@/lib/leagues";

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
  rank: RankInfo;
  preview: RankPreview;
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
      // Gate: redireciona para onboarding se ainda não terminou
      const { data: prof } = await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", user.id)
        .maybeSingle();
      if (!prof?.onboarded_at) {
        navigate({ to: "/onboarding" });
        return;
      }

      await rolloverWeekIfNeeded(user.id);
      const stats = await getOrCreateStats(user.id);
      const mission = await getOrCreateTodayMission(user.id);
      const counts = await getAttemptCounts(mission.id);
      const totalAnswered =
        counts.BIO.total +
        counts.QUI.total +
        counts.FIS.total +
        counts.LP.total +
        counts.MAT.total +
        counts.REV.total;
      const totalTarget =
        mission.bio_target +
        mission.qui_target +
        mission.fis_target +
        mission.lp_target +
        mission.mat_target +
        mission.rev_target;

      let state: HomeState = "not_started";
      if (mission.completed) state = "completed_today";
      else if (totalAnswered > 0) state = "in_progress";
      else if (stats.delay_days > 0) state = "failed_yesterday";

      const rank = await fetchRankInfo(user.id);
      const preview = await previewMissionImpact(user.id, estimateMissionXp());

      if (active) {
        setData({ mission, stats, counts, totalAnswered, totalTarget, state, rank, preview });
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
  const { mission, stats, counts, totalAnswered, totalTarget, state, rank, preview } = data;
  const progressPct = Math.round((totalAnswered / totalTarget) * 100);

  const startMission = async () => {
    setBusy(true);
    navigate({ to: "/missao" });
  };

  // Mostra apenas as disciplinas com target > 0 (definido pelo objetivo do aluno).
  const allSubjects: SubjectCode[] = ["BIO", "QUI", "FIS", "LP", "MAT", "REV"];
  const subjects = allSubjects.filter((code) => mission[TARGET_FIELDS[code]] > 0);

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

        {/* XP & Nível */}
        <section className="bg-card border border-border rounded-lg p-5">
          <XPBar progress={levelProgress(stats.xp_total)} />
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

        {/* Card de ranking destacado: posição, liga, quanto falta */}
        <Link
          to="/ranking"
          className="block bg-card border border-border rounded-lg p-5 hover:bg-accent transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="uppercase-tight text-[10px] text-muted-foreground">A tua posição</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-3xl font-bold tabular-nums">
                  {rank.position > 0 ? `#${rank.position}` : "—"}
                </span>
                {rank.total > 0 && (
                  <span className="text-mono text-xs text-muted-foreground">
                    de {rank.total}
                  </span>
                )}
              </div>
            </div>
            <LeagueBadge league={rank.league} size="md" />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="uppercase-tight text-[10px] text-muted-foreground">Sobe 1 posição</div>
              <div className="font-display text-sm font-bold mt-0.5 tabular-nums">
                {rank.xpToNextPosition > 0 ? `+${rank.xpToNextPosition} XP` : "—"}
              </div>
            </div>
            <div>
              <div className="uppercase-tight text-[10px] text-muted-foreground">Top 10</div>
              <div className="font-display text-sm font-bold mt-0.5 tabular-nums">
                {rank.position > 0 && rank.position <= 10
                  ? "Lá dentro"
                  : rank.xpToTop10 > 0
                    ? `+${rank.xpToTop10} XP`
                    : "—"}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-mono text-[11px] text-muted-foreground">
              {stats.weekly_xp} XP esta semana
            </span>
            <span className="uppercase-tight text-[10px] text-muted-foreground">
              Ver ranking →
            </span>
          </div>
        </Link>

        {/* Preview de impacto da missão */}
        {!mission.completed && (
          <section className="bg-card border border-border rounded-lg p-5">
            <SekuloMessage tone={preview.delta > 0 ? "success" : "neutral"}>
              {preMissionMessage(preview.current, preview.projected)}
            </SekuloMessage>
          </section>
        )}

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

        {/* Acessos: treino por tópico + simulado de exame passado */}
        <section className="grid grid-cols-2 gap-2">
          <Link
            to="/treino"
            className="bg-card border border-border rounded-lg p-4 hover:bg-accent transition-colors"
          >
            <div className="uppercase-tight text-[10px] text-muted-foreground">Treino</div>
            <div className="font-display text-sm font-bold mt-1">Por tópico</div>
          </Link>
          <Link
            to="/simulado"
            className="bg-card border border-border rounded-lg p-4 hover:bg-accent transition-colors"
          >
            <div className="uppercase-tight text-[10px] text-muted-foreground">Simulado</div>
            <div className="font-display text-sm font-bold mt-1">Exame passado</div>
          </Link>
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
