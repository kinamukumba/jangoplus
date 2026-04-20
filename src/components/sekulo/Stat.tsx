import { cn } from "@/lib/utils";

interface StatProps {
  label: string;
  value: string | number;
  tone?: "neutral" | "success" | "alert";
  className?: string;
}

export function Stat({ label, value, tone = "neutral", className }: StatProps) {
  const valueColor =
    tone === "alert" ? "text-destructive" : tone === "success" ? "text-success" : "text-foreground";

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="uppercase-tight text-[10px] text-muted-foreground">{label}</span>
      <span className={cn("font-display text-2xl font-bold tabular-nums", valueColor)}>
        {value}
      </span>
    </div>
  );
}
