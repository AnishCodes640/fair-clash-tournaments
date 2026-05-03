import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const TIER_COLORS: Record<string, string> = {
  blue: "text-blue-500",
  gold: "text-amber-400",
  diamond: "text-cyan-300 drop-shadow-[0_0_4px_hsl(190_85%_55%/0.8)]",
};

export function VerifiedBadge({ tier, size = 14, className }: { tier?: string | null; size?: number; className?: string }) {
  if (!tier) return null;
  const color = TIER_COLORS[tier] || "text-primary";
  return <BadgeCheck className={cn(color, className)} style={{ width: size, height: size }} aria-label={`${tier} verified`} />;
}
