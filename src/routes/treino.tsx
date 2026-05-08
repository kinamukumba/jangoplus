import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { listTopics, type TopicBucket } from "@/lib/exams";
import { SUBJECT_LABELS, type SubjectCode } from "@/lib/sekulo-config";
import { targetsForGoal, normalizeGoal } from "@/lib/goals";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/treino")({
  component: TreinoPage,
});

function TreinoPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<TopicBucket[] | null>(null);
  const [allowedSubjects, setAllowedSubjects] = useState<Set<SubjectCode> | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("goal").eq("id", user.id).maybeSingle();
      const targets = targetsForGoal(normalizeGoal(prof?.goal ?? null));
      const allowed = new Set<SubjectCode>(
        (Object.keys(targets) as SubjectCode[]).filter((c) => (targets[c] ?? 0) > 0),
      );
      // Permite sempre revisões
      allowed.add("REV");
      setAllowedSubjects(allowed);
      const t = await listTopics();
      setTopics(t);
    })();
  }, [user]);

  if (loading || !user || !topics || !allowedSubjects) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="uppercase-tight text-xs text-muted-foreground">A carregar...</div>
      </div>
    );
  }

  const filtered = topics.filter((t) => allowedSubjects.has(t.subject_code));
  const grouped = filtered.reduce<Record<SubjectCode, TopicBucket[]>>(
    (acc, t) => {
      (acc[t.subject_code] = acc[t.subject_code] ?? []).push(t);
      return acc;
    },
    {} as Record<SubjectCode, TopicBucket[]>,
  );

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="px-5 pt-6 pb-4 border-b border-border flex items-center justify-between">
        <div>
          <div className="uppercase-tight text-[10px] text-muted-foreground">JANGO+</div>
          <h1 className="font-display text-base font-bold">Treino por tópico</h1>
        </div>
        <Link to="/" className="uppercase-tight text-[10px] text-muted-foreground">Voltar</Link>
      </header>

      <main className="px-5 pt-6 max-w-md mx-auto space-y-6">
        {(Object.keys(grouped) as SubjectCode[]).map((code) => (
          <section key={code}>
            <h2 className="uppercase-tight text-xs mb-3">{SUBJECT_LABELS[code]}</h2>
            <ul className="space-y-2">
              {grouped[code].map((t) => (
                <li key={`${code}-${t.topic}`}>
                  <Link
                    to="/treino/$subject/$topic"
                    params={{ subject: code, topic: t.topic }}
                    className="flex items-center justify-between bg-card border border-border rounded-md px-4 py-3 hover:bg-accent transition-colors"
                  >
                    <span className="font-medium">{t.topic}</span>
                    <span className="text-mono text-xs text-muted-foreground tabular-nums">
                      {t.count} questões
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Sem tópicos disponíveis para o teu objetivo.</p>
        )}
      </main>
    </div>
  );
}
