import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SekuloMessage } from "@/components/sekulo/SekuloMessage";
import { daysUntilExam, type SubjectCode } from "@/lib/sekulo-config";
import { GOALS, normalizeGoal } from "@/lib/goals";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

type Step = "goal" | "university" | "diagnostic" | "result";

const GOAL_OPTIONS = [
  { value: "medicina", label: "Medicina" },
  { value: "engenharia", label: "Engenharia" },
  { value: "outro", label: "Outro" },
];

const UNIVERSITIES = [
  { value: "UAN", label: "UAN" },
  { value: "UCAN", label: "UCAN" },
  { value: "ISPTEC", label: "ISPTEC" },
  { value: "outra", label: "Outra" },
];

interface DiagQuestion {
  id: string;
  subject_id: string;
  subject_code: SubjectCode;
  statement: string;
  options: string[];
  correct_index: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [step, setStep] = useState<Step>("goal");
  const [goal, setGoal] = useState<string | null>(null);
  const [university, setUniversity] = useState<string | null>(null);

  const [questions, setQuestions] = useState<DiagQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);

  // Auth gate + skip if already onboarded
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.onboarded_at) {
        navigate({ to: "/" });
      }
    })();
  }, [user, loading, navigate]);

  // Carrega 3 perguntas (uma por disciplina) baseadas no objetivo escolhido.
  useEffect(() => {
    if (step !== "diagnostic" || questions.length > 0 || !user || !goal) return;
    (async () => {
      const goalKey = normalizeGoal(goal);
      const targetCodes = GOALS[goalKey].diagnostic;
      const { data: subs } = await supabase
        .from("subjects")
        .select("id, code")
        .in("code", targetCodes);
      const subjects = (subs ?? []) as { id: string; code: SubjectCode }[];

      // Mantém a ordem definida em GOALS[goal].diagnostic
      const ordered = targetCodes
        .map((code) => subjects.find((s) => s.code === code))
        .filter((s): s is { id: string; code: SubjectCode } => Boolean(s));

      const picks: DiagQuestion[] = [];
      for (const s of ordered) {
        const { data: qs } = await supabase
          .from("questions")
          .select("id, subject_id, statement, options, correct_index")
          .eq("subject_id", s.id)
          .eq("difficulty", "easy")
          .limit(20);
        const pool = (qs ?? []) as Omit<DiagQuestion, "subject_code">[];
        if (pool.length === 0) continue;
        const pick = shuffle(pool)[0];
        picks.push({ ...pick, subject_code: s.code });
      }
      setQuestions(picks);
    })();
  }, [step, questions.length, user, goal]);

  const totalQ = questions.length;
  const currentQ = questions[qIndex];

  const handleAnswer = () => {
    if (selected === null || !currentQ) return;
    const correct = selected === currentQ.correct_index;
    const nextAnswers = [...answers, selected];
    const nextScore = score + (correct ? 1 : 0);
    setAnswers(nextAnswers);
    setScore(nextScore);
    setSelected(null);

    if (qIndex + 1 >= totalQ) {
      setStep("result");
    } else {
      setQIndex(qIndex + 1);
    }
  };

  const finishOnboarding = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          goal,
          university,
          diagnostic_score: score,
          onboarded_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (error) throw error;
      navigate({ to: "/missao" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
      setBusy(false);
    }
  };

  const days = useMemo(() => daysUntilExam(), []);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="uppercase-tight text-xs text-muted-foreground">A carregar...</div>
      </div>
    );
  }

  // Header com progresso linear
  const stepIndex = step === "goal" ? 1 : step === "university" ? 2 : step === "diagnostic" ? 3 : 4;
  const totalSteps = 4;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 pt-6 pb-4 border-b border-border">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div className="font-display text-base font-bold tracking-tight">Jango+</div>
            <div className="uppercase-tight text-[10px] text-muted-foreground tabular-nums">
              {stepIndex}/{totalSteps}
            </div>
          </div>
          <div className="h-1 bg-muted rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-300"
              style={{ width: `${(stepIndex / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 py-8 max-w-md mx-auto w-full">
        {step === "goal" && (
          <ChoiceStep
            title="Qual é o teu objetivo?"
            subtitle="Escolhe o curso que pretendes seguir."
            options={GOALS}
            value={goal}
            onChange={setGoal}
            onNext={() => setStep("university")}
            nextDisabled={!goal}
          />
        )}

        {step === "university" && (
          <ChoiceStep
            title="Em que universidade queres entrar?"
            subtitle="Vamos preparar-te para o exame certo."
            options={UNIVERSITIES}
            value={university}
            onChange={setUniversity}
            onNext={() => setStep("diagnostic")}
            nextDisabled={!university}
            onBack={() => setStep("goal")}
          />
        )}

        {step === "diagnostic" && (
          <div>
            <div className="mb-6">
              <div className="uppercase-tight text-[10px] text-muted-foreground">
                Diagnóstico rápido · {Math.min(qIndex + 1, totalQ || 1)}/{totalQ || 3}
              </div>
              <h2 className="font-display text-xl font-bold mt-2">
                3 perguntas. Menos de 1 minuto.
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Sem feedback agora. O Sekulo avalia no fim.
              </p>
            </div>

            {!currentQ ? (
              <div className="text-sm text-muted-foreground">A preparar perguntas...</div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="uppercase-tight text-[10px] text-muted-foreground mb-2">
                  Pergunta {qIndex + 1}
                </div>
                <p className="text-base leading-relaxed mb-5">{currentQ.statement}</p>
                <ul className="space-y-2">
                  {currentQ.options.map((opt, i) => (
                    <li key={i}>
                      <button
                        onClick={() => setSelected(i)}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-md border transition-colors text-sm",
                          selected === i
                            ? "border-foreground bg-accent"
                            : "border-border hover:bg-accent/50",
                        )}
                      >
                        {opt}
                      </button>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={handleAnswer}
                  disabled={selected === null}
                  className="w-full h-12 uppercase-tight text-xs mt-5"
                >
                  {qIndex + 1 >= totalQ ? "Concluir diagnóstico" : "Próxima"}
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "result" && (
          <ResultStep
            score={score}
            total={totalQ || 3}
            days={days}
            busy={busy}
            onStart={finishOnboarding}
          />
        )}
      </main>
    </div>
  );
}

interface ChoiceStepProps {
  title: string;
  subtitle: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (v: string) => void;
  onNext: () => void;
  nextDisabled: boolean;
  onBack?: () => void;
}

function ChoiceStep({
  title,
  subtitle,
  options,
  value,
  onChange,
  onNext,
  nextDisabled,
  onBack,
}: ChoiceStepProps) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold leading-tight">{title}</h2>
      <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>

      <ul className="space-y-2 mt-6">
        {options.map((opt) => (
          <li key={opt.value}>
            <button
              onClick={() => onChange(opt.value)}
              className={cn(
                "w-full text-left px-4 py-4 rounded-md border transition-colors",
                value === opt.value
                  ? "border-foreground bg-accent"
                  : "border-border hover:bg-accent/50",
              )}
            >
              <span className="font-medium">{opt.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-3 mt-8">
        {onBack && (
          <Button
            variant="secondary"
            onClick={onBack}
            className="flex-1 h-12 uppercase-tight text-xs"
          >
            Voltar
          </Button>
        )}
        <Button
          onClick={onNext}
          disabled={nextDisabled}
          className="flex-1 h-12 uppercase-tight text-xs"
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}

interface ResultStepProps {
  score: number;
  total: number;
  days: number;
  busy: boolean;
  onStart: () => void;
}

function ResultStep({ score, total, days, busy, onStart }: ResultStepProps) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const verdict =
    pct >= 80
      ? "Tens base. Falta consistência."
      : pct >= 40
        ? "Ainda não estás preparado."
        : "Estás muito longe. Começa hoje.";

  return (
    <div>
      <div>
        <div className="uppercase-tight text-[10px] text-muted-foreground">Faltam</div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="font-display text-5xl font-bold tabular-nums">{days}</span>
          <span className="text-sm text-muted-foreground">dias para o exame</span>
        </div>
      </div>

      <div className="mt-6 bg-card border border-border rounded-lg p-5">
        <div className="uppercase-tight text-[10px] text-muted-foreground">Diagnóstico</div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="font-display text-3xl font-bold tabular-nums">
            {score}/{total}
          </span>
          <span className="text-sm text-muted-foreground">respostas certas</span>
        </div>
        <div className="text-sm font-medium mt-2">{verdict}</div>
      </div>

      <div className="mt-6 bg-card border border-border rounded-lg p-5">
        <SekuloMessage tone="alert">
          Identifiquei as tuas falhas. Vamos corrigir isso agora.
        </SekuloMessage>
      </div>

      <Button
        onClick={onStart}
        disabled={busy}
        className="w-full h-12 uppercase-tight text-xs mt-8"
      >
        {busy ? "..." : "Começar missão"}
      </Button>
    </div>
  );
}
