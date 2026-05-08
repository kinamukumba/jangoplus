import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getExamQuestions,
  startExamAttempt,
  recordExamAnswer,
  finishExamAttempt,
  type ExamQuestion,
  type Exam,
} from "@/lib/exams";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/simulado/$examId")({
  component: SimuladoRunPage,
});

function fmt(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function SimuladoRunPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { examId } = Route.useParams();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[] | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState<number>(0);
  const startedRef = useRef<number>(Date.now());
  const finishingRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: e } = await supabase.from("exams").select("*").eq("id", examId).maybeSingle();
      if (!e) { navigate({ to: "/simulado" }); return; }
      const ex = e as Exam;
      const qs = await getExamQuestions(examId);
      const id = await startExamAttempt(user.id, examId, qs.length);
      setExam(ex);
      setQuestions(qs);
      setAttemptId(id);
      setRemaining(ex.duration_minutes * 60);
      startedRef.current = Date.now();
    })();
  }, [user, examId, navigate]);

  // Cronómetro
  useEffect(() => {
    if (!exam) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          void finish();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam]);

  const total = questions?.length ?? 0;
  const current = questions?.[idx];
  const answeredCount = Object.keys(answers).length;

  const finish = async () => {
    if (finishingRef.current || !user || !attemptId) return;
    finishingRef.current = true;
    const duration = Math.round((Date.now() - startedRef.current) / 1000);
    // Regista todas as respostas selecionadas
    if (questions) {
      for (const q of questions) {
        const sel = answers[q.id];
        if (sel !== undefined) {
          await recordExamAnswer(user.id, attemptId, q, sel);
        }
      }
    }
    await finishExamAttempt(user.id, attemptId, duration);
    navigate({ to: "/simulado/resultado/$attemptId", params: { attemptId } });
  };

  const choose = (i: number) => {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: i }));
  };

  const onNext = () => {
    if (idx + 1 >= total) {
      void finish();
    } else {
      setIdx((i) => i + 1);
    }
  };

  const lowTime = useMemo(() => remaining <= 60, [remaining]);

  if (loading || !user || !exam || !questions || !current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="uppercase-tight text-xs text-muted-foreground">A carregar simulado...</div>
      </div>
    );
  }

  const selected = answers[current.id];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="uppercase-tight text-[10px] text-muted-foreground truncate">{exam.name}</span>
          <span className={cn("text-mono text-sm tabular-nums font-bold", lowTime ? "text-destructive" : "text-foreground")}>
            {fmt(remaining)}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums mb-2">
          <span>Questão {idx + 1}/{total}</span>
          <span>{answeredCount} respondidas</span>
        </div>
        <Progress value={(idx / total) * 100} className="h-1" />
      </header>

      <main className="flex-1 px-5 pt-6 max-w-md mx-auto w-full">
        <h1 className="font-display text-xl leading-snug font-semibold mb-6">{current.statement}</h1>
        <div className="space-y-2">
          {current.options.map((opt, i) => {
            const isSel = selected === i;
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-md border transition-colors flex items-center gap-3",
                  isSel ? "border-foreground bg-accent" : "border-border bg-card hover:bg-accent",
                )}
              >
                <span className="uppercase-tight text-[10px] text-muted-foreground w-5">{String.fromCharCode(65 + i)}</span>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="px-5 py-5 border-t border-border bg-background sticky bottom-0 flex gap-2">
        {idx > 0 && (
          <Button variant="outline" onClick={() => setIdx((i) => i - 1)} className="h-12 uppercase-tight text-xs">
            Anterior
          </Button>
        )}
        <Button onClick={onNext} className="flex-1 h-12 uppercase-tight text-xs">
          {idx + 1 >= total ? "Terminar" : "Próxima"}
        </Button>
      </footer>

      <div className="px-5 pb-4 text-center">
        <Link to="/simulado" className="uppercase-tight text-[10px] text-muted-foreground">Sair (sem guardar)</Link>
      </div>
    </div>
  );
}
