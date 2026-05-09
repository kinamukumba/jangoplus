import { Link } from "@tanstack/react-router";

export interface Neighbor {
  user_id: string;
  display_name: string;
  weekly_xp: number;
  rank_position: number;
  relation: "above" | "self" | "below";
}

interface Props {
  neighbors: Neighbor[];
  myXp: number;
}

export function NeighborStrip({ neighbors, myXp }: Props) {
  const above = neighbors.filter((n) => n.relation === "above").slice(-1)[0];
  const below = neighbors.filter((n) => n.relation === "below")[0];
  if (!above && !below) return null;
  return (
    <Link
      to="/ranking"
      className="block bg-card border border-border rounded-lg p-4 hover:bg-accent transition-colors"
    >
      <div className="uppercase-tight text-[10px] text-muted-foreground mb-2">Vizinhança</div>
      <div className="space-y-1.5 text-sm">
        {above && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              <span className="text-success">↑</span> {above.display_name}
            </span>
            <span className="text-mono text-xs tabular-nums">
              +{Math.max(1, above.weekly_xp - myXp)} XP para subir
            </span>
          </div>
        )}
        {below && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              <span className="text-destructive">↓</span> {below.display_name}
            </span>
            <span className="text-mono text-xs tabular-nums text-destructive">
              {Math.max(1, myXp - below.weekly_xp)} XP de margem
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
