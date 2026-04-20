import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { todayISO, SUBJECT_LABELS, type SubjectCode } from "@/lib/sekulo-config";
import { resultMessage } from "@/lib/sekulo-voice";
import { SekuloMessage } from "@/components/sekulo/SekuloMessage";
import { Button } from "@/components/ui/button";

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

function ResultPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("daily_missions")
        .select("score_total, score_bio, score_qui, score_fis, score_rev, completed")
        .eq("user_id", user.id)
        .eq("mission_date", todayISO())
        .maybeSingle();
      if (!data || !data.completed) {
        navigate({ to: "/" });
        return;
      }
      setResult({
        total: Math.round(data.score_total ?? 0),
        bio: Math.round(data.score_bio ?? 0),
        qui: Math.round(data.score_qui ?? 0),
        fis: Math.round(data.score_fis ?? 0),
        rev: Math.round(data.score_rev ?? 0),
      });
    })();
  }, [user, navigate]);

  if (!result) {
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

        <section className="pt-2">
          <Button asChild variant="secondary" className="w-full h-12 uppercase-tight text-xs">
            <Link to="/">Voltar amanhã</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
