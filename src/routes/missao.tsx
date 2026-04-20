import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  getOrCreateTodayMission,
  getAttemptCounts,
  TARGET_FIELDS,
  completeMission,
  type DailyMission,
} from "@/lib/mission";
import { SUBJECT_LABELS, type SubjectCode } from "@/lib/sekulo-config";
import { correctMessage, wrongMessage, SUBJECT_ORDER } from "@/lib/sekulo-voice";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SekuloMessage } from "@/components/sekulo/SekuloMessage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/missao")({
  component: MissionPage,
});

interface Question {
  id: string;
  subject_id: string;
  statement: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
}

interface SubjectData {
  code: SubjectCode;
  subject_id: string;
  questions: Question[];
}

function MissionPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [mission, setMission] = useState<DailyMission | null>(null);
  const [pool, setPool] = useState<SubjectData[]>([]);
  const [counts, setCounts] = useState<Record<SubjectCode, { total: number; correct: number }> | null>(null);
  const [current, setCurrent] = useState<{ q: Question; code: SubjectCode } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const m = await getOrCreateTodayMission(user.id);
      if (m.completed) {
        navigate({ to: "/resultado" });
        return;
      }
      const { data: subs } = await supabase.from("subjects").select("id, code");
      const subjects = (subs ?? []) as { id: string; code: SubjectCode }[];

      const pools: SubjectData[] = [];
      for (const s of subjects) {
        const { data: qs } = await supabase
          .from("questions")
          .select("id, subject_id, statement, options, correct_index, explanation")
          .eq("subject_id", s.id);
        pools.push({
          code: s.code,
          subject_id: s.id,
          questions: ((qs ?? []) as Question[]).sort(() => Math.random() - 0.5),
        });
      }
      const c = await getAttemptCounts(m.id);
      if (!active) return;
      setMission(m);
      setPool(pools);
      setCounts(c);
    })();
    return () => {
      active = false;
    };
  }, [user, navigate]);

  // Decide próxima questão sempre que counts/pool muda
  useEffect(() => {
    if (!mission || !counts || pool.length === 0) return;
    if (current) return;

    const nextCode = SUBJECT_ORDER.find((code) => {
      const target = mission[TARGET_FIELDS[code]];
      return counts[code].total < target;
    });

    if (!nextCode) {
      // Tudo cumprido — finalizar
      void finish();
      return;
    }

    const subjectPool = pool.find((p) => p.code === nextCode);
    if (!subjectPool || subjectPool.questions.length === 0) {
      // sem questões nessa disciplina — força próximo
      // marca como cumprido virtualmente avançando counts
      setCounts((prev) => prev && { ...prev, [nextCode]: { ...prev[nextCode], total: mission[TARGET_FIELDS[nextCode]] } });
      return;
    }

    // Pega questão (rotativo pelo total respondido)
    const idx = counts[nextCode].total % subjectPool.questions.length;
    setCurrent({ q: subjectPool.questions[idx], code: nextCode });
    setSelected(null);
    setShowFeedback(false);
  }, [mission, counts, pool, current]);

  const totalTarget = useMemo(
    () => (mission ? mission.bio_target + mission.qui_target + mission.fis_target + mission.rev_target : 0),
    [mission],
  );
  const totalDone = useMemo(
    () => (counts ? counts.BIO.total + counts.QUI.total + counts.FIS.total + counts.REV.total : 0),
    [counts],
  );

  const submitAnswer = async () => {
    if (!user || !mission || !current || selected === null) return;
    setBusy(true);
    const isCorrect = selected === current.q.correct_index;
    await supabase.from("mission_attempts").insert({
      user_id: user.id,
      mission_id: mission.id,
      question_id: current.q.id,
      subject_code: current.code,
      selected_index: selected,
      is_correct: isCorrect,
    });
    setCounts((prev) =>
      prev && {
        ...prev,
        [current.code]: {
          total: prev[current.code].total + 1,
          correct: prev[current.code].correct + (isCorrect ? 1 : 0),
        },
      },
    );
    setShowFeedback(true);
    setBusy(false);
  };

  const nextQuestion = () => {
    setCurrent(null);
  };

  const finish = async () => {
    if (!user || !mission || !counts) return;
    const perSubject: Record<SubjectCode, number> = {
      BIO: percentSafe(counts.BIO),
      QUI: percentSafe(counts.QUI),
      FIS: percentSafe(counts.FIS),
      REV: percentSafe(counts.REV),
    };
    const totalCorrect = counts.BIO.correct + counts.QUI.correct + counts.FIS.correct + counts.REV.correct;
    const total = counts.BIO.total + counts.QUI.total + counts.FIS.total + counts.REV.total;
    const totalScore = total === 0 ? 0 : Math.round((totalCorrect / total) * 100);
    await completeMission(user.id, mission, { total: totalScore, perSubject }, counts);
    navigate({ to: "/resultado" });
  };

  if (loading || !user || !mission || !counts || !current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="uppercase-tight text-xs text-muted-foreground">A carregar...</div>
      </div>
    );
  }

  const isCorrect = selected !== null && selected === current.q.correct_index;
  const progressPct = totalTarget === 0 ? 0 : Math.round((totalDone / totalTarget) * 100);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="uppercase-tight text-[10px] text-muted-foreground">
            {SUBJECT_LABELS[current.code]}
          </span>
          <span className="text-mono text-xs text-muted-foreground tabular-nums">
            {totalDone}/{totalTarget}
          </span>
        </div>
        <Progress value={progressPct} className="h-1" />
      </header>

      {/* Sekulo line */}
      {showFeedback && (
        <div className="px-5 pt-5">
          <SekuloMessage tone={isCorrect ? "success" : "alert"}>
            {isCorrect ? correctMessage(totalDone) : wrongMessage(totalDone)}
          </SekuloMessage>
        </div>
      )}

      {/* Question */}
      <main className="flex-1 px-5 pt-6 max-w-md mx-auto w-full">
        <h1 className="font-display text-xl leading-snug font-semibold mb-6">
          {current.q.statement}
        </h1>

        <div className="space-y-2">
          {current.q.options.map((opt, i) => {
            const isSelected = selected === i;
            const correct = i === current.q.correct_index;
            let style = "border-border bg-card hover:bg-accent";
            if (showFeedback) {
              if (correct) style = "border-success bg-success/10 text-foreground";
              else if (isSelected) style = "border-destructive bg-destructive/10 text-foreground";
              else style = "border-border bg-card opacity-60";
            } else if (isSelected) {
              style = "border-foreground bg-accent";
            }
            return (
              <button
                key={i}
                disabled={showFeedback}
                onClick={() => setSelected(i)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-md border transition-colors flex items-center gap-3",
                  style,
                )}
              >
                <span className="uppercase-tight text-[10px] text-muted-foreground w-5">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
        </div>

        {showFeedback && current.q.explanation && (
          <div className="mt-6 border-l-2 border-muted-foreground pl-4 py-1">
            <div className="uppercase-tight text-[10px] text-muted-foreground mb-1">Explicação</div>
            <p className="text-sm text-foreground/90">{current.q.explanation}</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-5 py-5 border-t border-border bg-background sticky bottom-0">
        {!showFeedback ? (
          <Button
            onClick={submitAnswer}
            disabled={selected === null || busy}
            className="w-full h-12 uppercase-tight text-xs"
          >
            Responder
          </Button>
        ) : (
          <Button onClick={nextQuestion} className="w-full h-12 uppercase-tight text-xs">
            Próxima
          </Button>
        )}
      </footer>
    </div>
  );
}

function percentSafe(c: { total: number; correct: number }): number {
  if (c.total === 0) return 0;
  return Math.round((c.correct / c.total) * 100);
}
