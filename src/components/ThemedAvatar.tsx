import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTheme } from "@/lib/themes";

interface Props {
  src?: string | null;
  name?: string | null;
  themeId?: string | null;
  size?: number;
  className?: string;
}

export function ThemedAvatar({ src, name, themeId, size = 40, className }: Props) {
  const theme = getTheme(themeId);
  const dim = `${size}px`;
  const initial = (name || "?")[0]?.toUpperCase() || "?";

  return (
    <div className={cn("inline-block", theme.borderClass, className)} style={{ width: dim, height: dim }}>
      <div className="w-full h-full rounded-full overflow-hidden bg-secondary flex items-center justify-center">
        {src ? (
          <img src={src} alt={name || ""} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-xs font-bold text-muted-foreground">{initial}</span>
        )}
      </div>
    </div>
  );
}
