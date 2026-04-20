import { cn } from "@/lib/utils";
import type { LevelProgress } from "@/lib/progression";

interface XPBarProps {
  progress: LevelProgress;
  className?: string;
}

export function XPBar({ progress, className }: XPBarProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="uppercase-tight text-[10px] text-muted-foreground">Nível</span>
          <span className="font-display text-2xl font-bold tabular-nums">{progress.level}</span>
        </div>
        <span className="text-mono text-xs text-muted-foreground tabular-nums">
          {progress.currentXp} / {progress.ceiling} XP
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-foreground transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <div className="uppercase-tight text-[10px] text-muted-foreground">
        {progress.toNext > 0
          ? `Faltam ${progress.toNext} XP para nível ${progress.level + 1}`
          : "Nível máximo atingido"}
      </div>
    </div>
  );
}
