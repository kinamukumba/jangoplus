import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { listExams, type Exam } from "@/lib/exams";
import { Button } from "@/components/ui/button";
import { SUBJECT_LABELS, type SubjectCode } from "@/lib/sekulo-config";

export const Route = createFileRoute("/simulado/")({
  component: SimuladoListPage,
});

function SimuladoListPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[] | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    (async () => setExams(await listExams()))();
  }, []);

  if (loading || !user || !exams) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="uppercase-tight text-xs text-muted-foreground">A carregar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="px-5 pt-6 pb-4 border-b border-border flex items-center justify-between">
        <div>
          <div className="uppercase-tight text-[10px] text-muted-foreground">JANGO+</div>
          <h1 className="font-display text-base font-bold">Simulados</h1>
        </div>
        <Link to="/" className="uppercase-tight text-[10px] text-muted-foreground">Voltar</Link>
      </header>

      <main className="px-5 pt-6 max-w-md mx-auto space-y-3">
        {exams.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem simulados disponíveis.</p>
        ) : (
          exams.map((e) => (
            <div key={e.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-display text-base font-semibold">{e.name}</div>
                  <div className="uppercase-tight text-[10px] text-muted-foreground mt-1">
                    {SUBJECT_LABELS[e.subject_code as SubjectCode]} · {e.year}
                  </div>
                </div>
                <span className="text-mono text-xs text-muted-foreground tabular-nums">
                  {e.duration_minutes} min
                </span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-mono text-xs text-muted-foreground">{e.total_questions} questões</span>
                <Button asChild size="sm" className="uppercase-tight text-[10px] h-9">
                  <Link to="/simulado/$examId" params={{ examId: e.id }}>Iniciar</Link>
                </Button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
