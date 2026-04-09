import { useState, useEffect } from "react";
import { ArrowLeft, Check, Lock, Sparkles, Palette, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ThemeDef {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  borderClass: string;
  previewGradient: string;
  available: boolean;
}

const THEMES: ThemeDef[] = [
  {
    id: "basic",
    name: "Basic",
    price: 0,
    description: "Clean default theme",
    features: ["Simple avatar border", "Standard colors", "Minimal animations"],
    borderClass: "border-border",
    previewGradient: "from-muted to-secondary",
    available: true,
  },
  {
    id: "advanced",
    name: "Advanced",
    price: 50,
    description: "Enhanced visuals",
    features: ["Animated avatar border", "Enhanced color palette", "Leaderboard highlights", "Extra UI animations"],
    borderClass: "border-primary",
    previewGradient: "from-primary/30 to-accent/30",
    available: true,
  },
  {
    id: "ultra",
    name: "Ultra",
    price: 150,
    description: "Premium experience",
    features: ["High-quality animated borders", "Exclusive profile animations", "Special leaderboard effects", "Premium UI styling"],
    borderClass: "border-yellow-500",
    previewGradient: "from-yellow-500/20 via-primary/20 to-pink-500/20",
    available: true,
  },
  {
    id: "neon",
    name: "Neon",
    price: 0,
    description: "Neon glow effects",
    features: ["Neon avatar glow", "Glowing UI elements"],
    borderClass: "border-border",
    previewGradient: "from-cyan-500/20 to-green-500/20",
    available: false,
  },
  {
    id: "royal",
    name: "Royal",
    price: 0,
    description: "Royal luxury theme",
    features: ["Gold accents", "Royal animations"],
    borderClass: "border-border",
    previewGradient: "from-amber-500/20 to-purple-500/20",
    available: false,
  },
];

const SettingsPage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [ownedThemes, setOwnedThemes] = useState<string[]>(["basic"]);
  const [activeTheme, setActiveTheme] = useState("basic");
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("user_themes")
        .select("theme_id")
        .eq("user_id", user.id);
      const owned = ["basic", ...(data || []).map((t: any) => t.theme_id)];
      setOwnedThemes(owned);
      setActiveTheme(profile?.active_theme || "basic");
    };
    load();
  }, [user, profile]);

  const handlePurchase = async (theme: ThemeDef) => {
    if (!user) { toast.error("Please sign in first"); return; }
    if (ownedThemes.includes(theme.id)) {
      // Just activate
      await supabase.from("profiles").update({ active_theme: theme.id }).eq("user_id", user.id);
      setActiveTheme(theme.id);
      await refreshProfile();
      toast.success(`${theme.name} theme activated!`);
      return;
    }
    setPurchasing(true);
    try {
      const { data, error } = await supabase.rpc("purchase_theme", {
        p_theme_id: theme.id,
        p_price: theme.price,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      setOwnedThemes((prev) => [...prev, theme.id]);
      setActiveTheme(theme.id);
      await refreshProfile();
      toast.success(`${theme.name} theme purchased and activated!`);
    } catch (err: any) {
      toast.error(err.message || "Purchase failed");
    } finally {
      setPurchasing(false);
    }
  };

  const handleActivate = async (themeId: string) => {
    if (!user) return;
    await supabase.from("profiles").update({ active_theme: themeId }).eq("user_id", user.id);
    setActiveTheme(themeId);
    await refreshProfile();
    toast.success("Theme activated!");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/profile" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Palette className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold tracking-tight">Themes & Settings</h1>
      </div>

      {user && profile && (
        <div className="surface-card rounded-lg px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Wallet Balance</span>
          <span className="font-mono-num font-semibold">₹{Number(profile.wallet_balance || 0).toFixed(2)}</span>
        </div>
      )}

      <div className="space-y-3">
        {THEMES.map((theme) => {
          const owned = ownedThemes.includes(theme.id);
          const active = activeTheme === theme.id;
          return (
            <div key={theme.id} className={cn(
              "surface-card rounded-xl overflow-hidden border-2 transition-all",
              active ? "border-primary" : theme.available ? "border-transparent hover:border-primary/30" : "border-transparent opacity-60"
            )}>
              <div className={cn("h-16 bg-gradient-to-r", theme.previewGradient, "flex items-center justify-center")}>
                {theme.id === "ultra" && <Crown className="h-8 w-8 text-yellow-500" />}
                {theme.id === "advanced" && <Sparkles className="h-8 w-8 text-primary" />}
                {theme.id === "basic" && <Palette className="h-8 w-8 text-muted-foreground" />}
                {!theme.available && <Lock className="h-8 w-8 text-muted-foreground" />}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      {theme.name}
                      {!theme.available && (
                        <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium">Coming Soon</span>
                      )}
                      {active && (
                        <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-bold">Active</span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">{theme.description}</p>
                  </div>
                  <span className="font-mono-num text-sm font-bold text-primary">
                    {theme.price === 0 ? "Free" : `₹${theme.price}`}
                  </span>
                </div>
                <ul className="text-[11px] text-muted-foreground space-y-1 mb-3">
                  {theme.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-success" /> {f}
                    </li>
                  ))}
                </ul>
                {theme.available && (
                  <button
                    onClick={() => owned ? handleActivate(theme.id) : handlePurchase(theme)}
                    disabled={active || purchasing}
                    className={cn(
                      "w-full h-9 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all",
                      active ? "bg-muted text-muted-foreground cursor-default" :
                      owned ? "bg-secondary text-foreground hover:bg-accent" :
                      "bg-primary text-primary-foreground hover:opacity-90"
                    )}
                  >
                    {active ? "Currently Active" : owned ? "Activate" : `Purchase for ₹${theme.price}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SettingsPage;
