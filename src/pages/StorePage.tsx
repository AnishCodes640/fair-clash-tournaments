import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { THEMES, getTheme } from "@/lib/themes";
import { ThemedAvatar } from "@/components/ThemedAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ShoppingCart, Sparkles, BadgeCheck, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/SEO";

const StorePage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState<"themes" | "badges">("themes");
  const [owned, setOwned] = useState<string[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any>({ discount_percent: 0 });
  const [busy, setBusy] = useState<string | null>(null);
  const [activeVer, setActiveVer] = useState<any>(null);

  const loadAll = async () => {
    if (!user) return;
    const [tRes, vtRes, sRes, avRes] = await Promise.all([
      supabase.from("user_themes").select("theme_id").eq("user_id", user.id),
      supabase.from("verification_tiers").select("*").eq("is_active", true).order("price"),
      supabase.from("app_settings").select("value").eq("key", "theme_pricing").maybeSingle(),
      supabase.rpc("get_active_verification", { p_user_id: user.id }),
    ]);
    setOwned((tRes.data || []).map((r: any) => r.theme_id));
    setTiers(vtRes.data || []);
    if (sRes.data?.value) setPricing(sRes.data.value);
    setActiveVer(avRes.data?.[0] || null);
  };

  useEffect(() => { loadAll(); }, [user]);

  const discountedPrice = (base: number) => {
    const d = Number(pricing.discount_percent || 0);
    return d > 0 ? Math.round(base * (1 - d / 100)) : base;
  };

  const buyTheme = async (theme: typeof THEMES[number]) => {
    if (!user) { toast.error("Sign in first"); return; }
    const price = pricing[theme.id] != null ? Number(pricing[theme.id]) : theme.price;
    const final = discountedPrice(price);
    setBusy(theme.id);
    const { data, error } = await supabase.rpc("purchase_theme", { p_theme_id: theme.id, p_price: final });
    setBusy(null);
    const res = data as any;
    if (error || !res?.success) { toast.error(res?.error || error?.message || "Purchase failed"); return; }
    toast.success(`${theme.name} unlocked!`);
    await refreshProfile();
    await loadAll();
  };

  const applyTheme = async (id: string) => {
    if (!user) return;
    await supabase.from("profiles").update({ active_theme: id }).eq("user_id", user.id);
    await refreshProfile();
    toast.success("Theme applied");
  };

  const buyBadge = async (tierId: string) => {
    setBusy(tierId);
    const { data, error } = await supabase.rpc("purchase_verification", { p_tier_id: tierId });
    setBusy(null);
    const res = data as any;
    if (error || !res?.success) { toast.error(res?.error || error?.message || "Purchase failed"); return; }
    toast.success("Verified badge active!");
    await refreshProfile();
    await loadAll();
  };

  return (
    <>
      <SEO title="Store — Themes & Cosmetics — FairClash" description="Buy premium themes and cosmetic upgrades for your FairClash profile using your wallet balance." path="/store" />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold tracking-tight">Store</h1>
        {Number(pricing.discount_percent || 0) > 0 && (
          <span className="ml-auto text-xs font-bold bg-success/15 text-success px-2 py-1 rounded-md">{pricing.discount_percent}% OFF</span>
        )}
      </div>

      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
        <button onClick={() => setTab("themes")} className={cn("px-4 py-2 rounded-md text-xs font-medium flex items-center gap-1.5", tab === "themes" ? "bg-card shadow-sm" : "text-muted-foreground")}>
          <Sparkles className="h-3.5 w-3.5" /> Themes
        </button>
        <button onClick={() => setTab("badges")} className={cn("px-4 py-2 rounded-md text-xs font-medium flex items-center gap-1.5", tab === "badges" ? "bg-card shadow-sm" : "text-muted-foreground")}>
          <BadgeCheck className="h-3.5 w-3.5" /> Verified
        </button>
      </div>

      {tab === "themes" && (
        <div className="grid sm:grid-cols-2 gap-3">
          {THEMES.map((t) => {
            const isOwned = t.price === 0 || owned.includes(t.id);
            const isActive = profile?.active_theme === t.id;
            const basePrice = pricing[t.id] != null ? Number(pricing[t.id]) : t.price;
            const final = discountedPrice(basePrice);
            return (
              <div key={t.id} className="surface-card rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <ThemedAvatar themeId={t.id} name={t.name} size={48} />
                  <div className="flex-1">
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">{t.description}</p>
                  </div>
                </div>
                <div className="flex gap-1">{t.swatch.map((c, i) => <span key={i} className="h-4 flex-1 rounded" style={{ background: c }} />)}</div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-mono-num">
                    {basePrice === 0 ? <span className="text-success font-bold">Free</span> : (
                      <>
                        {final < basePrice && <span className="line-through text-muted-foreground mr-1">₹{basePrice}</span>}
                        <span className="font-bold">₹{final}</span>
                      </>
                    )}
                  </div>
                  {isActive ? (
                    <span className="text-xs px-3 py-1.5 rounded-md bg-success/15 text-success font-medium flex items-center gap-1"><Check className="h-3 w-3" /> Active</span>
                  ) : isOwned ? (
                    <button onClick={() => applyTheme(t.id)} className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium">Apply</button>
                  ) : (
                    <button onClick={() => buyTheme(t)} disabled={busy === t.id} className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center gap-1">
                      {busy === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Buy
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "badges" && (
        <div className="space-y-3">
          {activeVer && (
            <div className="surface-card rounded-xl p-4 flex items-center gap-3 border-success/40">
              <VerifiedBadge tier={activeVer.tier} size={28} />
              <div className="flex-1">
                <p className="text-sm font-bold capitalize">{activeVer.tier} verified active</p>
                <p className="text-[11px] text-muted-foreground">Expires {new Date(activeVer.expires_at).toLocaleDateString()}</p>
              </div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {tiers.map((tier: any) => {
              const final = discountedPrice(Number(tier.price));
              return (
                <div key={tier.id} className="surface-card rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <VerifiedBadge tier={tier.tier} size={20} />
                    <p className="text-sm font-bold">{tier.display_name}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground capitalize">{tier.duration} · {tier.duration_days} days</p>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-mono-num">
                      {final < Number(tier.price) && <span className="line-through text-muted-foreground mr-1">₹{tier.price}</span>}
                      <span className="font-bold">₹{final}</span>
                    </div>
                    <button onClick={() => buyBadge(tier.id)} disabled={busy === tier.id} className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center gap-1">
                      {busy === tier.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Buy
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default StorePage;
