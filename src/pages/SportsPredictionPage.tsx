import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Clock, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Match = any;

const SportsPredictionPage = () => {
  const { user, refreshProfile } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [options, setOptions] = useState<Record<string, any[]>>({});
  const [myPicks, setMyPicks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [mRes, oRes, pRes] = await Promise.all([
      supabase.from("sports_matches").select("*").order("start_time", { ascending: true }),
      supabase.from("prediction_options").select("*").order("display_order"),
      user ? supabase.from("user_predictions").select("match_id, option_id").eq("user_id", user.id) : Promise.resolve({ data: [] } as any),
    ]);
    setMatches(mRes.data || []);
    const grouped: Record<string, any[]> = {};
    (oRes.data || []).forEach((o: any) => { (grouped[o.match_id] = grouped[o.match_id] || []).push(o); });
    setOptions(grouped);
    const picks: Record<string, string> = {};
    (pRes.data || []).forEach((p: any) => { picks[p.match_id] = p.option_id; });
    setMyPicks(picks);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("sports-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "sports_matches" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "prediction_options" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const placeBet = async (matchId: string, optionId: string) => {
    if (!user) { toast.error("Sign in first"); return; }
    setBusy(optionId);
    const { data, error } = await supabase.rpc("place_sports_prediction", { p_match_id: matchId, p_option_id: optionId });
    setBusy(null);
    const res = data as any;
    if (error || !res?.success) { toast.error(res?.error || error?.message || "Failed"); return; }
    toast.success("Prediction placed!");
    await refreshProfile();
    await load();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold tracking-tight">Sports Predictions</h1>
      </div>

      {matches.length === 0 && (
        <div className="surface-card rounded-xl p-12 text-center text-sm text-muted-foreground">No matches yet. Check back soon.</div>
      )}

      {matches.map((m) => {
        const opts = options[m.id] || [];
        const myPick = myPicks[m.id];
        const started = new Date(m.start_time) <= new Date();
        return (
          <div key={m.id} className="surface-card rounded-xl overflow-hidden">
            {m.thumbnail_url && <img src={m.thumbnail_url} alt={m.title} className="w-full h-32 object-cover" loading="lazy" />}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{m.title}</p>
                  {m.description && <p className="text-[11px] text-muted-foreground line-clamp-2">{m.description}</p>}
                </div>
                <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                  m.status === "resolved" ? "bg-muted text-muted-foreground" :
                  started ? "bg-warning/15 text-warning" : "bg-success/15 text-success")}>
                  {m.status === "resolved" ? "Resolved" : started ? "Live" : "Upcoming"}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(m.start_time).toLocaleString()}</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{m.current_players}/{m.max_players}</span>
                <span>Entry ₹{Number(m.entry_fee)}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {opts.map((o: any) => {
                  const selected = myPick === o.id;
                  const won = m.winning_option_id === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => placeBet(m.id, o.id)}
                      disabled={!!myPick || started || m.status !== "upcoming" || busy === o.id}
                      className={cn("rounded-lg p-3 text-left border transition-colors",
                        selected ? "border-primary bg-primary/10" :
                        won ? "border-success bg-success/10" :
                        "border-border hover:border-primary/40",
                        "disabled:opacity-60 disabled:cursor-not-allowed")}
                    >
                      <p className="text-xs font-medium truncate">{o.label}</p>
                      <p className="text-sm font-bold font-mono-num text-primary">×{Number(o.multiplier).toFixed(2)}</p>
                      {selected && <p className="text-[10px] text-primary mt-1">Your pick</p>}
                      {won && <p className="text-[10px] text-success mt-1">Winner</p>}
                    </button>
                  );
                })}
                {opts.length === 0 && <p className="text-[11px] text-muted-foreground col-span-full">Options coming soon.</p>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SportsPredictionPage;
