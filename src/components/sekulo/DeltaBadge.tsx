import { cn } from "@/lib/utils";

interface DeltaBadgeProps {
  delta: number; // positivo = subiu, negativo = caiu
  className?: string;
}

// Indicador visual de variação de posição.
// Verde = subiu, Vermelho = caiu, Neutro = igual.
export function DeltaBadge({ delta, className }: DeltaBadgeProps) {
  if (delta === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 uppercase-tight text-[10px] text-muted-foreground",
          className,
        )}
      >
        <span>—</span>
        <span>Sem mudança</span>
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 uppercase-tight text-[10px] font-semibold",
        up ? "text-success" : "text-destructive",
        className,
      )}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      <span className="tabular-nums">
        {up ? "+" : "-"}
        {Math.abs(delta)} posiç{Math.abs(delta) === 1 ? "ão" : "ões"}
      </span>
    </span>
  );
}
