import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const LEVELS: Record<string, { label: string; color: string; bg: string }> = {
  bronze: { label: "Bronze", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  silver: { label: "Silver", color: "text-gray-300", bg: "bg-gray-400/10 border-gray-400/30" },
  gold: { label: "Gold", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/40" },
  diamond: { label: "Diamond", color: "text-cyan-300", bg: "bg-cyan-400/10 border-cyan-400/40" },
};

export function ProgressBadge({ level, xp, className }: { level?: string | null; xp?: number; className?: string }) {
  const meta = LEVELS[level || "bronze"] || LEVELS.bronze;
  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase", meta.bg, meta.color, className)}>
      <Trophy className="h-3 w-3" />
      {meta.label}
      {typeof xp === "number" && <span className="font-mono-num opacity-75">{xp} XP</span>}
    </div>
  );
}
