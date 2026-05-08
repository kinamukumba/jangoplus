import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getTopicQuestions, type ExamQuestion } from "@/lib/exams";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SekuloMessage } from "@/components/sekulo/SekuloMessage";
import { SUBJECT_LABELS, type SubjectCode } from "@/lib/sekulo-config";
import { correctMessage, wrongMessage } from "@/lib/sekulo-voice";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/treino/$subject/$topic")({
  component: TopicTrainPage,
});

function TopicTrainPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { subject, topic } = Route.useParams();
  const [questions, setQuestions] = useState<ExamQuestion[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    (async () => {
      const qs = await getTopicQuestions(subject as SubjectCode, topic);
      setQuestions(qs);
    })();
  }, [subject, topic]);

  const current = questions?.[idx];
  const total = questions?.length ?? 0;
  const finished = useMemo(() => questions !== null && idx >= total, [questions, idx, total]);

  if (loading || !user || !questions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="uppercase-tight text-xs text-muted-foreground">A carregar...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 px-6">
        <p className="text-sm text-muted-foreground text-center">
          Sem questões disponíveis para este tópico.
        </p>
        <Button asChild variant="outline"><Link to="/treino">Voltar</Link></Button>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((correctCount / total) * 100);
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 px-5 pt-10 max-w-md mx-auto w-full space-y-6">
          <h1 className="font-display text-2xl font-bold">{topic}</h1>
          <div>
            <div className="uppercase-tight text-[10px] text-muted-foreground">Acertos</div>
            <div className="font-display text-5xl font-bold tabular-nums">{pct}%</div>
            <div className="text-mono text-xs text-muted-foreground mt-1">{correctCount}/{total}</div>
          </div>
          <SekuloMessage tone={pct >= 70 ? "success" : "alert"}>
            {pct >= 70 ? "Domínio aceitável neste tópico." : "Este tópico ainda não está dominado. Repete."}
          </SekuloMessage>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1 h-12 uppercase-tight text-xs">
              <Link to="/treino">Outro tópico</Link>
            </Button>
            <Button onClick={() => { setIdx(0); setCorrectCount(0); setSelected(null); setShowFeedback(false); }} className="flex-1 h-12 uppercase-tight text-xs">
              Repetir
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const isCorrect = selected !== null && selected === current!.correct_index;
  const submit = () => {
    if (selected === null) return;
    if (selected === current!.correct_index) setCorrectCount((c) => c + 1);
    setShowFeedback(true);
  };
  const next = () => {
    setSelected(null);
    setShowFeedback(false);
    setIdx((i) => i + 1);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="uppercase-tight text-[10px] text-muted-foreground">
            {SUBJECT_LABELS[subject as SubjectCode]} · {topic}
          </span>
          <span className="text-mono text-xs text-muted-foreground tabular-nums">{idx + 1}/{total}</span>
        </div>
        <Progress value={((idx) / total) * 100} className="h-1" />
      </header>

      {showFeedback && (
        <div className="px-5 pt-5">
          <SekuloMessage tone={isCorrect ? "success" : "alert"}>
            {isCorrect ? correctMessage(idx) : wrongMessage(idx)}
          </SekuloMessage>
        </div>
      )}

      <main className="flex-1 px-5 pt-6 max-w-md mx-auto w-full">
        <h1 className="font-display text-xl leading-snug font-semibold mb-6">{current!.statement}</h1>
        <div className="space-y-2">
          {current!.options.map((opt, i) => {
            const isSel = selected === i;
            const correct = i === current!.correct_index;
            let style = "border-border bg-card hover:bg-accent";
            if (showFeedback) {
              if (correct) style = "border-success bg-success/10";
              else if (isSel) style = "border-destructive bg-destructive/10";
              else style = "border-border bg-card opacity-60";
            } else if (isSel) style = "border-foreground bg-accent";
            return (
              <button
                key={i}
                disabled={showFeedback}
                onClick={() => setSelected(i)}
                className={cn("w-full text-left px-4 py-3 rounded-md border transition-colors flex items-center gap-3", style)}
              >
                <span className="uppercase-tight text-[10px] text-muted-foreground w-5">{String.fromCharCode(65 + i)}</span>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
        </div>
        {showFeedback && current!.explanation && (
          <div className="mt-6 border-l-2 border-muted-foreground pl-4 py-1">
            <div className="uppercase-tight text-[10px] text-muted-foreground mb-1">Explicação</div>
            <p className="text-sm text-foreground/90">{current!.explanation}</p>
          </div>
        )}
      </main>

      <footer className="px-5 py-5 border-t border-border bg-background sticky bottom-0">
        {!showFeedback ? (
          <Button onClick={submit} disabled={selected === null} className="w-full h-12 uppercase-tight text-xs">
            Responder
          </Button>
        ) : (
          <Button onClick={next} className="w-full h-12 uppercase-tight text-xs">
            {idx + 1 >= total ? "Ver resultado" : "Próxima"}
          </Button>
        )}
      </footer>
    </div>
  );
}
