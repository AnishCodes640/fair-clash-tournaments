import { Trophy, Clock, Radio, CheckCircle2, Users, IndianRupee } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

type Tab = "upcoming" | "live" | "completed";

const tabs: { id: Tab; label: string; icon: typeof Clock }[] = [
  { id: "upcoming", label: "Upcoming", icon: Clock },
  { id: "live", label: "Live", icon: Radio },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
];

const TournamentsPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTournaments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tournaments")
      .select("*, games(title)")
      .eq("status", activeTab)
      .order("start_time", { ascending: activeTab === "upcoming" });
    setTournaments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTournaments();
    const channel = supabase
      .channel("tournaments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => fetchTournaments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTab]);

  const joinTournament = async (tournament: any) => {
    if (!user) { toast.error("Please sign in to join"); return; }
    const { error } = await supabase.from("tournament_participants").insert({
      tournament_id: tournament.id,
      user_id: user.id,
    });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Already joined!" : error.message);
    } else {
      toast.success("Joined tournament!");
      fetchTournaments();
    }
  };

  return (
    <>
      <SEO title="Live & Upcoming Tournaments — FairClash" description="Join cash tournaments on FairClash. View entry fees, prize pools, and live brackets for upcoming, live and completed events." path="/tournaments" />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold tracking-tight">Tournaments</h1>

      <div className="flex gap-1 bg-secondary rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-colors",
              activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="surface-card rounded-lg p-12 text-center text-sm text-muted-foreground">Loading...</div>
      ) : tournaments.length === 0 ? (
        <div className="surface-card rounded-lg p-12 flex flex-col items-center justify-center text-center">
          <Trophy className="h-8 w-8 text-primary mb-4" />
          <h2 className="text-lg font-semibold mb-2">No {tabs.find((t) => t.id === activeTab)?.label} Tournaments</h2>
          <p className="text-sm text-muted-foreground">Tournaments will appear here once created by the admin.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t) => (
            <div key={t.id} className="surface-card rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{(t as any).games?.title}</p>
                </div>
                {activeTab === "upcoming" && (
                  <button
                    onClick={() => joinTournament(t)}
                    className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
                  >
                    Join
                  </button>
                )}
                {activeTab === "live" && (
                  <span className="px-2 py-0.5 rounded-md bg-success/10 text-success text-xs font-medium flex items-center gap-1">
                    <Radio className="h-3 w-3" /> Live
                  </span>
                )}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> Entry: ₹{Number(t.entry_fee).toFixed(0)}</span>
                <span className="flex items-center gap-1"><Trophy className="h-3 w-3" /> Prize: ₹{Number(t.prize_pool).toFixed(0)}</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {t.current_players}/{t.max_players}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(t.start_time).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
};

export default TournamentsPage;
