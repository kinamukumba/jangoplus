import { Link } from "@tanstack/react-router";
import type { ApprovalResult } from "@/lib/approval";
import { cn } from "@/lib/utils";

interface Props {
  result: ApprovalResult | null;
  className?: string;
}

const TIER_STYLE = {
  strong:   { ring: "text-success", bg: "bg-success/10", label: "text-success" },
  risk:     { ring: "text-warning", bg: "bg-warning/10", label: "text-warning" },
  critical: { ring: "text-destructive", bg: "bg-destructive/10", label: "text-destructive" },
} as const;

export function ApprovalGauge({ result, className }: Props) {
  if (!result) {
    return (
      <Link
        to="/simulado"
        className={cn(
          "block bg-card border border-border rounded-lg p-5 hover:bg-accent transition-colors",
          className,
        )}
      >
        <div className="uppercase-tight text-[10px] text-muted-foreground">Probabilidade de aprovação</div>
        <div className="font-display text-base font-bold mt-1">Faz 2 simulados para saber</div>
        <div className="text-xs text-muted-foreground mt-1">Iniciar simulado →</div>
      </Link>
    );
  }
  const style = TIER_STYLE[result.tier];
  return (
    <div className={cn("bg-card border border-border rounded-lg p-5", className)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="uppercase-tight text-[10px] text-muted-foreground">
            Probabilidade de aprovação
          </div>
          <div className={cn("font-display text-3xl font-bold mt-1 tabular-nums", style.label)}>
            {result.score}%
          </div>
          <div className={cn("uppercase-tight text-[10px] mt-1", style.label)}>{result.label}</div>
        </div>
        <span className={cn("h-3 w-3 rounded-full mt-2", style.ring.replace("text-", "bg-"))} />
      </div>
      <div className="text-[11px] text-muted-foreground mt-3">
        Baseado nos últimos {result.simulados} simulados.
      </div>
    </div>
  );
}
