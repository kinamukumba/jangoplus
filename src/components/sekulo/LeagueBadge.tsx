import { cn } from "@/lib/utils";
import { LEAGUE_COLORS, LEAGUE_LABELS, type League } from "@/lib/leagues";

interface LeagueBadgeProps {
  league: League;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LeagueBadge({ league, size = "md", className }: LeagueBadgeProps) {
  const dot = size === "lg" ? "h-3 w-3" : size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  const text = size === "lg" ? "text-sm" : "text-[10px]";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 uppercase-tight",
        text,
        className,
      )}
    >
      <span
        className={cn("rounded-full", dot)}
        style={{ backgroundColor: LEAGUE_COLORS[league] }}
      />
      <span className="font-semibold tracking-wider">{LEAGUE_LABELS[league]}</span>
    </span>
  );
}
