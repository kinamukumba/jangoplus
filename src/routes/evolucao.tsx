import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchEvolution, type SubjectComparison } from "@/lib/evolution";
import { SUBJECT_LABELS } from "@/lib/sekulo-config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/evolucao")({
  component: EvolutionPage,
});

function EvolutionPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<SubjectComparison[] | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchEvolution(user.id).then(setItems);
  }, [user]);

  if (!items) {
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
          <div className="uppercase-tight text-[10px] text-muted-foreground">Evolução</div>
          <h1 className="font-display text-xl font-bold mt-1">7 dias vs 7 anteriores</h1>
        </div>
        <Link to="/" className="uppercase-tight text-[10px] text-muted-foreground hover:text-foreground">
          Voltar
        </Link>
      </header>

      <main className="px-5 pt-6 space-y-3 max-w-md mx-auto">
        {items.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-md">
            Sem dados suficientes ainda. Faz mais missões.
          </div>
        )}
        {items.map((it) => {
          const tone =
            it.delta >= 5 ? "text-success" : it.delta <= -5 ? "text-destructive" : "text-muted-foreground";
          return (
            <div key={it.code} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{SUBJECT_LABELS[it.code]}</span>
                <span className={cn("text-mono text-xs uppercase-tight tabular-nums", tone)}>
                  {it.delta >= 0 ? "+" : ""}
                  {it.delta} pp
                </span>
              </div>
              <div className="flex items-baseline gap-3 text-mono text-sm">
                <span className="text-muted-foreground tabular-nums">
                  {it.prev?.pct ?? "—"}
                  {it.prev ? "%" : ""}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="font-display font-bold tabular-nums">
                  {it.curr?.pct ?? "—"}
                  {it.curr ? "%" : ""}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground tabular-nums">
                {it.prev ? `Erravas ${it.prev.total - it.prev.correct}/${it.prev.total}` : "Sem semana anterior"}
                {it.curr ? ` · agora ${it.curr.total - it.curr.correct}/${it.curr.total}` : ""}
              </div>
            </div>
          );
        })}

        <Button asChild variant="secondary" className="w-full h-12 uppercase-tight text-xs mt-4">
          <Link to="/">Voltar à missão</Link>
        </Button>
      </main>
    </div>
  );
}
