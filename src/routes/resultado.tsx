import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { todayISO, SUBJECT_LABELS, type SubjectCode } from "@/lib/sekulo-config";
import { resultMessage, streakBonusMessage, rankDeltaMessage } from "@/lib/sekulo-voice";
import { SekuloMessage } from "@/components/sekulo/SekuloMessage";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/sekulo/Stat";
import { LeagueBadge } from "@/components/sekulo/LeagueBadge";
import { DeltaBadge } from "@/components/sekulo/DeltaBadge";
import { fetchRankInfo, type RankInfo } from "@/lib/ranking";
import { BLOOM_PUBLIC, BLOOM_PARENT_DESCRIPTION, type BloomLevel } from "@/lib/bloom";

export const Route = createFileRoute("/resultado")({
  component: ResultPage,
});

interface Result {
  total: number;
  bio: number;
  qui: number;
  fis: number;
  lp: number;
  mat: number;
  rev: number;
}

interface XPEventRow {
  kind: string;
  amount: number;
}

function ResultPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [result, setResult] = useState<Result | null>(null);
  const [xpBreakdown, setXpBreakdown] = useState<{
    base: number;
    correct: number;
    reviews: number;
    streakBonus: number;
    streakBonusKind: "streak_3" | "streak_7" | null;
    total: number;
  } | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [rank, setRank] = useState<RankInfo | null>(null);
  const [rankDelta, setRankDelta] = useState<number>(0);
  const [missionTargets, setMissionTargets] = useState<Record<SubjectCode, number> | null>(null);
  const [bloomBreakdown, setBloomBreakdown] = useState<Record<BloomLevel, { total: number; correct: number }> | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: mission } = await supabase
        .from("daily_missions")
        .select(
          "id, score_total, score_bio, score_qui, score_fis, score_lp, score_mat, score_rev, bio_target, qui_target, fis_target, lp_target, mat_target, rev_target, completed",
        )
        .eq("user_id", user.id)
        .eq("mission_date", todayISO())
        .maybeSingle();
      if (!mission || !mission.completed) {
        navigate({ to: "/" });
        return;
      }
      setResult({
        total: Math.round(mission.score_total ?? 0),
        bio: Math.round(mission.score_bio ?? 0),
        qui: Math.round(mission.score_qui ?? 0),
        fis: Math.round(mission.score_fis ?? 0),
        lp: Math.round(mission.score_lp ?? 0),
        mat: Math.round(mission.score_mat ?? 0),
        rev: Math.round(mission.score_rev ?? 0),
      });
      setMissionTargets({
        BIO: mission.bio_target,
        QUI: mission.qui_target,
        FIS: mission.fis_target,
        LP: mission.lp_target,
        MAT: mission.mat_target,
        REV: mission.rev_target,
      });

      const { data: events } = await supabase
        .from("xp_events")
        .select("kind, amount")
        .eq("mission_id", mission.id);
      const rows = (events ?? []) as XPEventRow[];
      const base = rows.find((e) => e.kind === "mission_complete")?.amount ?? 0;
      const correct = rows.filter((e) => e.kind === "correct_answer").reduce((s, e) => s + e.amount, 0);
      const reviews = rows.filter((e) => e.kind === "review").reduce((s, e) => s + e.amount, 0);
      const s3 = rows.find((e) => e.kind === "streak_3")?.amount ?? 0;
      const s7 = rows.find((e) => e.kind === "streak_7")?.amount ?? 0;
      const streakBonus = s3 + s7;
      setXpBreakdown({
        base,
        correct,
        reviews,
        streakBonus,
        streakBonusKind: s7 ? "streak_7" : s3 ? "streak_3" : null,
        total: base + correct + reviews + streakBonus,
      });

      const { data: stats } = await supabase
        .from("user_stats")
        .select("current_streak, level")
        .eq("user_id", user.id)
        .maybeSingle();
      if (stats) {
        setStreak(stats.current_streak);
        setLevel(stats.level);
      }

      // Impacto no ranking: compara com posição pré-missão guardada em sessionStorage
      const info = await fetchRankInfo(user.id);
      setRank(info);
      try {
        const raw = sessionStorage.getItem(`pre_rank_${mission.id}`);
        if (raw) {
          const pre = JSON.parse(raw) as { position: number };
          if (pre.position > 0 && info.position > 0) {
            setRankDelta(pre.position - info.position);
          } else if (pre.position === 0 && info.position > 0) {
            setRankDelta(info.total > 0 ? info.total - info.position + 1 : 0);
          }
        }
      } catch {
        // ignore
      }

      // Desempenho por competência (Bloom)
      const { data: attempts } = await supabase
        .from("mission_attempts")
        .select("bloom_level, is_correct")
        .eq("mission_id", mission.id);
      const bb: Record<BloomLevel, { total: number; correct: number }> = {
        1: { total: 0, correct: 0 },
        2: { total: 0, correct: 0 },
        3: { total: 0, correct: 0 },
        4: { total: 0, correct: 0 },
      };
      (attempts ?? []).forEach((a) => {
        const lvl = Math.min(4, Math.max(1, (a.bloom_level ?? 1) as number)) as BloomLevel;
        bb[lvl].total++;
        if (a.is_correct) bb[lvl].correct++;
      });
      setBloomBreakdown(bb);
    })();
  }, [user, navigate]);

  if (!result || !xpBreakdown) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="uppercase-tight text-xs text-muted-foreground">A carregar...</div>
      </div>
    );
  }

  const tone = result.total >= 60 ? "success" : "alert";
  const allScores: Array<[SubjectCode, number]> = [
    ["BIO", result.bio],
    ["QUI", result.qui],
    ["FIS", result.fis],
    ["LP", result.lp],
    ["MAT", result.mat],
    ["REV", result.rev],
  ];
  // Filtra apenas disciplinas que fizeram parte da missão (target > 0).
  const subjectScores = missionTargets
    ? allScores.filter(([code]) => missionTargets[code] > 0)
    : allScores;

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="px-5 pt-6 pb-4 border-b border-border">
        <div className="uppercase-tight text-[10px] text-muted-foreground">Missão concluída</div>
        <h1 className="font-display text-xl font-bold mt-1">Avaliação</h1>
      </header>

      <main className="px-5 pt-6 space-y-6 max-w-md mx-auto">
        <section className="bg-card border border-border rounded-lg p-6 text-center">
          <div className="uppercase-tight text-[10px] text-muted-foreground">Resultado geral</div>
          <div className="font-display text-7xl font-bold mt-2 tabular-nums">
            {result.total}
            <span className="text-3xl text-muted-foreground">%</span>
          </div>
        </section>

        <section className="bg-card border border-border rounded-lg p-5">
          <SekuloMessage tone={tone}>{resultMessage(result.total)}</SekuloMessage>
        </section>

        {/* XP ganho */}
        <section className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-baseline justify-between mb-3">
            <span className="uppercase-tight text-[10px] text-muted-foreground">XP ganho</span>
            <span className="font-display text-3xl font-bold tabular-nums text-success">
              +{xpBreakdown.total}
            </span>
          </div>
          <ul className="space-y-1 text-sm">
            <li className="flex justify-between text-muted-foreground">
              <span>Missão concluída</span>
              <span className="tabular-nums">+{xpBreakdown.base}</span>
            </li>
            <li className="flex justify-between text-muted-foreground">
              <span>Respostas corretas</span>
              <span className="tabular-nums">+{xpBreakdown.correct}</span>
            </li>
            {xpBreakdown.reviews > 0 && (
              <li className="flex justify-between text-muted-foreground">
                <span>Revisões</span>
                <span className="tabular-nums">+{xpBreakdown.reviews}</span>
              </li>
            )}
            {xpBreakdown.streakBonus > 0 && (
              <li className="flex justify-between text-success">
                <span>Bónus sequência {xpBreakdown.streakBonusKind === "streak_7" ? "(7 dias)" : "(3 dias)"}</span>
                <span className="tabular-nums">+{xpBreakdown.streakBonus}</span>
              </li>
            )}
          </ul>
        </section>

        {xpBreakdown.streakBonusKind && (
          <section className="bg-card border border-border rounded-lg p-5">
            <SekuloMessage tone="success">
              {streakBonusMessage(xpBreakdown.streakBonusKind === "streak_7" ? 7 : 3)}
            </SekuloMessage>
          </section>
        )}

        {/* Stats */}
        <section className="grid grid-cols-2 gap-4 bg-card border border-border rounded-lg p-5">
          <Stat label="Sequência" value={`${streak} dias`} tone="success" />
          <Stat label="Nível" value={level} tone="neutral" />
        </section>

        {/* Impacto no ranking */}
        {rank && (
          <section className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="uppercase-tight text-[10px] text-muted-foreground">
                  Posição agora
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-display text-4xl font-bold tabular-nums">
                    {rank.position > 0 ? `#${rank.position}` : "—"}
                  </span>
                  {rank.total > 0 && (
                    <span className="text-mono text-xs text-muted-foreground">
                      de {rank.total}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <DeltaBadge delta={rankDelta} />
                </div>
              </div>
              <LeagueBadge league={rank.league} size="md" />
            </div>
            <SekuloMessage tone={rankDelta > 0 ? "success" : rankDelta < 0 ? "alert" : "neutral"}>
              {rankDelta !== 0
                ? rankDeltaMessage(rankDelta)
                : rank.position > 0 && rank.position <= 10
                  ? "Estás no top 10. Não saias daí."
                  : "Posição mantida. Sobe mais."}
            </SekuloMessage>
          </section>
        )}
        <section>
          <h2 className="uppercase-tight text-xs mb-3">Por disciplina</h2>
          <ul className="space-y-2">
            {subjectScores.map(([code, score]) => {
              const t = score >= 60 ? "text-success" : score >= 40 ? "text-warning" : "text-destructive";
              return (
                <li
                  key={code}
                  className="flex items-center justify-between bg-card border border-border rounded-md px-4 py-3"
                >
                  <span className="font-medium">{SUBJECT_LABELS[code]}</span>
                  <span className={`text-mono text-sm tabular-nums ${t}`}>{score}%</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="pt-2 space-y-2">
          <Button asChild className="w-full h-12 uppercase-tight text-xs">
            <Link to="/ranking">Ver ranking</Link>
          </Button>
          <Button asChild variant="secondary" className="w-full h-12 uppercase-tight text-xs">
            <Link to="/">Voltar amanhã</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
