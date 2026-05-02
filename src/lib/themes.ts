export type ThemeId = "default" | "basic" | "advanced" | "ultra" | "premium";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  description: string;
  price: number; // 0 = free
  borderClass: string;
  rowClass: string;
  glowClass: string;
  swatch: string[];
}

export const THEMES: ThemeMeta[] = [
  {
    id: "default",
    name: "Default",
    description: "The standard look — free for everyone.",
    price: 0,
    borderClass: "ring-2 ring-border",
    rowClass: "",
    glowClass: "",
    swatch: ["#1a1a1a", "#2d2d2d", "#94a3b8", "#e5e5e5"],
  },
  {
    id: "basic",
    name: "Basic",
    description: "Clean blue accent border across the platform.",
    price: 0,
    borderClass: "ring-2 ring-blue-500",
    rowClass: "border-l-2 border-l-blue-500",
    glowClass: "shadow-[0_0_12px_hsl(217_91%_60%/0.4)]",
    swatch: ["#1e3a8a", "#3b82f6", "#60a5fa", "#dbeafe"],
  },
  {
    id: "advanced",
    name: "Advanced",
    description: "Animated gradient border that shifts colors smoothly.",
    price: 99,
    borderClass: "theme-border-advanced",
    rowClass: "border-l-2 border-l-purple-500 bg-purple-500/5",
    glowClass: "shadow-[0_0_18px_hsl(280_85%_60%/0.5)]",
    swatch: ["#581c87", "#a855f7", "#ec4899", "#f0abfc"],
  },
  {
    id: "ultra",
    name: "Ultra",
    description: "Golden glow with subtle shimmer — flagship status.",
    price: 299,
    borderClass: "theme-border-ultra",
    rowClass: "border-l-2 border-l-amber-400 bg-amber-400/5",
    glowClass: "shadow-[0_0_24px_hsl(45_93%_58%/0.6)]",
    swatch: ["#78350f", "#d97706", "#f59e0b", "#fde68a"],
  },
  {
    id: "premium",
    name: "Premium",
    description: "Iridescent rainbow shimmer — the ultimate flex.",
    price: 599,
    borderClass: "theme-border-premium",
    rowClass: "border-l-2 border-l-cyan-400 bg-gradient-to-r from-cyan-500/5 to-pink-500/5",
    glowClass: "shadow-[0_0_28px_hsl(190_85%_55%/0.55)]",
    swatch: ["#0e7490", "#06b6d4", "#a78bfa", "#f472b6"],
  },
];

export function getTheme(id?: string | null): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
