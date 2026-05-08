import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SekuloMessage } from "@/components/sekulo/SekuloMessage";
import { resultMessage } from "@/lib/sekulo-voice";
import { SUBJECT_LABELS, type SubjectCode } from "@/lib/sekulo-config";

export const Route = createFileRoute("/simulado/resultado/$attemptId")({
  component: SimuladoResultPage,
});

interface AttemptRow {
  id: string;
  exam_id: string;
  total_questions: number;
  correct_count: number;
  score: number;
  duration_seconds: number | null;
}

interface ErrorByTopic {
  subject_code: SubjectCode;
  topic: string;
  total: number;
  wrong: number;
}

function SimuladoResultPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { attemptId } = Route.useParams();
  const [attempt, setAttempt] = useState<AttemptRow | null>(null);
  const [examName, setExamName] = useState<string>("");
  const [errorsByTopic, setErrorsByTopic] = useState<ErrorByTopic[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    (async () => {
      const { data: a } = await supabase.from("exam_attempts").select("*").eq("id", attemptId).maybeSingle();
      if (!a) return;
      setAttempt(a as AttemptRow);

      const { data: ex } = await supabase.from("exams").select("name").eq("id", (a as AttemptRow).exam_id).maybeSingle();
      setExamName(ex?.name ?? "Simulado");

      const { data: ans } = await supabase
        .from("exam_attempt_answers")
        .select("subject_code, topic, is_correct")
        .eq("attempt_id", attemptId);
      const map = new Map<string, ErrorByTopic>();
      (ans ?? []).forEach((r) => {
        const row = r as { subject_code: SubjectCode; topic: string | null; is_correct: boolean };
        const topic = row.topic ?? "Geral";
        const key = `${row.subject_code}::${topic}`;
        const cur = map.get(key) ?? { subject_code: row.subject_code, topic, total: 0, wrong: 0 };
        cur.total++;
        if (!row.is_correct) cur.wrong++;
        map.set(key, cur);
      });
      setErrorsByTopic(Array.from(map.values()).sort((a, b) => b.wrong - a.wrong));
    })();
  }, [attemptId]);

  if (loading || !user || !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="uppercase-tight text-xs text-muted-foreground">A carregar...</div>
      </div>
    );
  }

  const weak = errorsByTopic.filter((e) => e.wrong > 0).slice(0, 5);

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="px-5 pt-6 pb-4 border-b border-border">
        <div className="uppercase-tight text-[10px] text-muted-foreground">RESULTADO DO SIMULADO</div>
        <h1 className="font-display text-base font-bold">{examName}</h1>
      </header>

      <main className="px-5 pt-6 max-w-md mx-auto space-y-6">
        <section>
          <div className="uppercase-tight text-[10px] text-muted-foreground">Pontuação</div>
          <div className="font-display text-6xl font-bold tabular-nums">{attempt.score}%</div>
          <div className="text-mono text-xs text-muted-foreground mt-1">
            {attempt.correct_count}/{attempt.total_questions} acertos
            {attempt.duration_seconds !== null && (
              <> · {Math.round(attempt.duration_seconds / 60)} min</>
            )}
          </div>
        </section>

        <section className="bg-card border border-border rounded-lg p-5">
          <SekuloMessage tone={attempt.score >= 60 ? "success" : "alert"}>
            {resultMessage(attempt.score)}
          </SekuloMessage>
        </section>

        <section>
          <h2 className="uppercase-tight text-xs mb-3">Erros por tema</h2>
          {weak.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem erros por tema. Nível alto.</p>
          ) : (
            <ul className="space-y-2">
              {weak.map((e) => (
                <li key={`${e.subject_code}-${e.topic}`} className="flex items-center justify-between bg-card border border-border rounded-md px-4 py-3">
                  <div>
                    <div className="font-medium">{e.topic}</div>
                    <div className="uppercase-tight text-[10px] text-muted-foreground">
                      {SUBJECT_LABELS[e.subject_code]}
                    </div>
                  </div>
                  <span className="text-mono text-xs text-destructive tabular-nums">
                    {e.wrong}/{e.total} erros
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {weak.length > 0 && (
          <section className="bg-card border border-border rounded-lg p-5">
            <div className="uppercase-tight text-[10px] text-muted-foreground mb-2">Próxima missão</div>
            <p className="text-sm text-foreground/90 mb-3">
              A tua próxima missão diária vai dar prioridade a estes temas.
            </p>
            <Button asChild className="w-full h-12 uppercase-tight text-xs">
              <Link to="/missao">Treinar agora</Link>
            </Button>
          </section>
        )}

        <div className="flex gap-2">
          <Button asChild variant="outline" className="flex-1 h-12 uppercase-tight text-xs">
            <Link to="/simulado">Outro simulado</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 h-12 uppercase-tight text-xs">
            <Link to="/">Início</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
