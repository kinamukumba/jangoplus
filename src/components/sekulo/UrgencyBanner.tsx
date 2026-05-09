import { cn } from "@/lib/utils";

interface Props {
  message: string;
  level: "critical" | "warn";
  className?: string;
}

export function UrgencyBanner({ message, level, className }: Props) {
  const style =
    level === "critical"
      ? "bg-destructive/10 border-destructive text-destructive"
      : "bg-warning/10 border-warning text-warning";
  return (
    <div
      className={cn(
        "border-l-2 px-4 py-2 uppercase-tight text-[11px] tracking-wider",
        style,
        className,
      )}
      role="alert"
    >
      {message}
    </div>
  );
}
