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
import { correctMessage, wrongByBloom, SUBJECT_ORDER } from "@/lib/sekulo-voice";
import { sortByBloomAsc, BLOOM_PUBLIC, type BloomLevel } from "@/lib/bloom";
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
  difficulty?: string | null;
  bloom_level?: number | null;
}

interface SubjectPool {
  code: SubjectCode;
  subject_id: string;
  fresh: Question[]; // nunca respondidas nos últimos 30 dias
  stale: Question[]; // já respondidas recentemente — usar só se acabar fresh
  asked: Set<string>; // IDs já usados nesta sessão/missão
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function MissionPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [mission, setMission] = useState<DailyMission | null>(null);
  const [pools, setPools] = useState<Record<SubjectCode, SubjectPool> | null>(null);
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

      // Guarda posição pré-missão para mostrar impacto no /resultado
      try {
        const { data: rankRow } = await supabase.rpc("get_user_rank", { _user_id: user.id });
        const r = (rankRow?.[0] ?? null) as { rank_position: number } | null;
        sessionStorage.setItem(
          `pre_rank_${m.id}`,
          JSON.stringify({ position: r?.rank_position ?? 0 }),
        );
      } catch {
        // ignore — não bloquear a missão
      }

      // 1. Disciplinas
      const { data: subs } = await supabase.from("subjects").select("id, code");
      const subjects = (subs ?? []) as { id: string; code: SubjectCode }[];

      // 2. Todas as questões em paralelo
      const { data: allQs } = await supabase
        .from("questions")
        .select("id, subject_id, statement, options, correct_index, explanation, difficulty, bloom_level");
      const allQuestions = (allQs ?? []) as Question[];

      // 2b. Nível Bloom desbloqueado pelo aluno
      const { data: statsRow } = await supabase
        .from("user_stats")
        .select("unlocked_bloom_level, weak_topics")
        .eq("user_id", user.id)
        .maybeSingle();
      const unlocked = (statsRow?.unlocked_bloom_level ?? 2) as number;

      // 3. Histórico recente do utilizador (últimos 30 dias): para evitar repetição
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data: recent } = await supabase
        .from("mission_attempts")
        .select("question_id")
        .eq("user_id", user.id)
        .gte("answered_at", since.toISOString());
      const recentIds = new Set((recent ?? []).map((r) => r.question_id as string));

      // 4. Questões já respondidas nesta missão (se o user saiu e voltou)
      const { data: todayAttempts } = await supabase
        .from("mission_attempts")
        .select("question_id")
        .eq("mission_id", m.id);
      const askedToday = new Set((todayAttempts ?? []).map((r) => r.question_id as string));

      // 4b. Tópicos fracos do último simulado — prioriza no pool fresh
      const weakTopicsBySubject: Record<string, Set<string>> = {};
      const weakRaw = (statsRow as { weak_topics?: Array<{ subject_code: string; topic: string }> } | null)?.weak_topics ?? [];
      for (const w of weakRaw) {
        (weakTopicsBySubject[w.subject_code] ??= new Set()).add(w.topic);
      }

      const built: Record<SubjectCode, SubjectPool> = {} as Record<SubjectCode, SubjectPool>;
      for (const s of subjects) {
        // Só usa questões cujo nível Bloom está desbloqueado
        const qs = allQuestions.filter(
          (q) => q.subject_id === s.id && (q.bloom_level ?? 1) <= unlocked,
        );
        const weakSet = weakTopicsBySubject[s.code];
        const sortWithWeak = (arr: Question[]) => {
          if (!weakSet || weakSet.size === 0) return sortByBloomAsc(arr);
          // Tópicos fracos primeiro, depois ordenação Bloom asc
          return arr.slice().sort((a, b) => {
            const aw = weakSet.has(((a as Question & { topic?: string | null }).topic ?? "")) ? 0 : 1;
            const bw = weakSet.has(((b as Question & { topic?: string | null }).topic ?? "")) ? 0 : 1;
            if (aw !== bw) return aw - bw;
            return (a.bloom_level ?? 1) - (b.bloom_level ?? 1);
          });
        };
        const fresh = sortWithWeak(
          shuffle(qs.filter((q) => !recentIds.has(q.id) && !askedToday.has(q.id))),
        );
        const stale = sortByBloomAsc(
          shuffle(qs.filter((q) => recentIds.has(q.id) && !askedToday.has(q.id))),
        );
        built[s.code] = {
          code: s.code,
          subject_id: s.id,
          fresh,
          stale,
          asked: new Set(askedToday),
        };
      }

      const c = await getAttemptCounts(m.id);
      if (!active) return;
      setMission(m);
      setPools(built);
      setCounts(c);
    })();
    return () => {
      active = false;
    };
  }, [user, navigate]);

  // Próxima questão
  useEffect(() => {
    if (!mission || !counts || !pools) return;
    if (current) return;

    const nextCode = SUBJECT_ORDER.find((code) => {
      const target = mission[TARGET_FIELDS[code]];
      return counts[code].total < target;
    });

    if (!nextCode) {
      void finish();
      return;
    }

    const p = pools[nextCode];
    if (!p) {
      // sem pool — marca como atingido para avançar
      setCounts((prev) => prev && { ...prev, [nextCode]: { ...prev[nextCode], total: mission[TARGET_FIELDS[nextCode]] } });
      return;
    }

    // Escolhe da pool fresh; se esgotada, usa stale
    let q: Question | undefined;
    while (p.fresh.length > 0) {
      const cand = p.fresh.shift()!;
      if (!p.asked.has(cand.id)) {
        q = cand;
        break;
      }
    }
    if (!q) {
      while (p.stale.length > 0) {
        const cand = p.stale.shift()!;
        if (!p.asked.has(cand.id)) {
          q = cand;
          break;
        }
      }
    }

    if (!q) {
      // sem questões disponíveis nessa disciplina — avança objetivo
      setCounts((prev) => prev && { ...prev, [nextCode]: { ...prev[nextCode], total: mission[TARGET_FIELDS[nextCode]] } });
      return;
    }

    p.asked.add(q.id);
    setCurrent({ q, code: nextCode });
    setSelected(null);
    setShowFeedback(false);
  }, [mission, counts, pools, current]);

  const totalTarget = useMemo(
    () =>
      mission
        ? mission.bio_target +
          mission.qui_target +
          mission.fis_target +
          mission.lp_target +
          mission.mat_target +
          mission.rev_target
        : 0,
    [mission],
  );
  const totalDone = useMemo(
    () =>
      counts
        ? counts.BIO.total +
          counts.QUI.total +
          counts.FIS.total +
          counts.LP.total +
          counts.MAT.total +
          counts.REV.total
        : 0,
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
      bloom_level: (current.q.bloom_level ?? 1) as number,
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
      LP: percentSafe(counts.LP),
      MAT: percentSafe(counts.MAT),
      REV: percentSafe(counts.REV),
    };
    const totalCorrect =
      counts.BIO.correct +
      counts.QUI.correct +
      counts.FIS.correct +
      counts.LP.correct +
      counts.MAT.correct +
      counts.REV.correct;
    const total =
      counts.BIO.total +
      counts.QUI.total +
      counts.FIS.total +
      counts.LP.total +
      counts.MAT.total +
      counts.REV.total;
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
      <header className="px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="uppercase-tight text-[10px] text-muted-foreground flex items-center gap-2">
            {SUBJECT_LABELS[current.code]}
            <span className="text-foreground/70">·</span>
            <span className="text-foreground/80">
              {BLOOM_PUBLIC[(current.q.bloom_level ?? 1) as BloomLevel]}
            </span>
          </span>
          <span className="text-mono text-xs text-muted-foreground tabular-nums">
            {totalDone}/{totalTarget}
          </span>
        </div>
        <Progress value={progressPct} className="h-1" />
      </header>

      {showFeedback && (
        <div className="px-5 pt-5">
          <SekuloMessage tone={isCorrect ? "success" : "alert"}>
            {isCorrect
              ? correctMessage(totalDone)
              : wrongByBloom((current.q.bloom_level ?? 1) as BloomLevel, totalDone)}
          </SekuloMessage>
        </div>
      )}

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
