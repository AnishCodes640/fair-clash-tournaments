import { cn } from "@/lib/utils";
import { getTheme } from "@/lib/themes";

interface Props {
  src?: string | null;
  name?: string | null;
  themeId?: string | null;
  size?: number;
  variant?: "round" | "box";
  className?: string;
}

export function ThemedAvatar({ src, name, themeId, size = 40, variant = "round", className }: Props) {
  const theme = getTheme(themeId);
  const dim = `${size}px`;
  const initial = (name || "?")[0]?.toUpperCase() || "?";
  const radiusOuter = variant === "box" ? "rounded-xl" : "rounded-full";
  const radiusInner = variant === "box" ? "rounded-[10px]" : "rounded-full";

  // For box variant, override theme border-radius (themes use rounded-full inline)
  const themeStyle: React.CSSProperties =
    variant === "box" ? { borderRadius: 12 } : {};

  return (
    <div
      className={cn("inline-block flex-shrink-0", theme.borderClass, radiusOuter, className)}
      style={{ width: dim, height: dim, ...themeStyle }}
    >
      <div className={cn("w-full h-full overflow-hidden bg-secondary flex items-center justify-center", radiusInner)}>
        {src ? (
          <img src={src} alt={name || ""} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="font-bold text-muted-foreground" style={{ fontSize: Math.max(10, size * 0.38) }}>{initial}</span>
        )}
      </div>
    </div>
  );
}
