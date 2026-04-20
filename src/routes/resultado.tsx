import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { todayISO, SUBJECT_LABELS, type SubjectCode } from "@/lib/sekulo-config";
import { resultMessage, levelUpMessage, streakBonusMessage } from "@/lib/sekulo-voice";
import { SekuloMessage } from "@/components/sekulo/SekuloMessage";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/sekulo/Stat";

export const Route = createFileRoute("/resultado")({
  component: ResultPage,
});

interface Result {
  total: number;
  bio: number;
  qui: number;
  fis: number;
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

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: mission } = await supabase
        .from("daily_missions")
        .select("id, score_total, score_bio, score_qui, score_fis, score_rev, completed")
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
        rev: Math.round(mission.score_rev ?? 0),
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
  const subjectScores: Array<[SubjectCode, number]> = [
    ["BIO", result.bio],
    ["QUI", result.qui],
    ["FIS", result.fis],
    ["REV", result.rev],
  ];

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
