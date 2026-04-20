import sekuloPortrait from "@/assets/sekulo.jpg";
import { cn } from "@/lib/utils";

interface SekuloAvatarProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24",
};

export function SekuloAvatar({ size = "md", className }: SekuloAvatarProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full ring-1 ring-border shrink-0",
        sizeMap[size],
        className,
      )}
    >
      <img
        src={sekuloPortrait}
        alt="Sekulo"
        width={256}
        height={256}
        loading="lazy"
        className="h-full w-full object-cover grayscale contrast-110"
      />
    </div>
  );
}

interface SekuloMessageProps {
  children: React.ReactNode;
  tone?: "neutral" | "alert" | "success";
  className?: string;
}

export function SekuloMessage({ children, tone = "neutral", className }: SekuloMessageProps) {
  const accent =
    tone === "alert"
      ? "border-l-destructive"
      : tone === "success"
        ? "border-l-success"
        : "border-l-foreground";

  return (
    <div className={cn("flex gap-4 items-start", className)}>
      <SekuloAvatar size="md" />
      <div className={cn("flex-1 border-l-2 pl-4 py-1", accent)}>
        <div className="uppercase-tight text-[10px] text-muted-foreground mb-1">SEKULO</div>
        <p className="sekulo-quote text-lg sm:text-xl text-foreground">{children}</p>
      </div>
    </div>
  );
}
