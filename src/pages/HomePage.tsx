import { Trophy, Gamepad2, ArrowRight, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const HomePage = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<any[]>([]);
  const [stats, setStats] = useState({ tournaments: 0, games: 0 });

  useEffect(() => {
    const load = async () => {
      const [noticesRes, gamesRes, tournamentsRes] = await Promise.all([
        supabase.from("notices").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(3),
        supabase.from("games").select("id").eq("is_active", true),
        supabase.from("tournaments").select("id").in("status", ["upcoming", "live"]),
      ]);
      setNotices(noticesRes.data || []);
      setStats({ games: gamesRes.data?.length || 0, tournaments: tournamentsRes.data?.length || 0 });
    };
    load();

    const channel = supabase
      .channel("notices-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "notices" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 animate-fade-in">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">FairClash Tournaments</h1>
        <p className="text-sm text-muted-foreground">Compete. Win. Withdraw. The professional standard for mobile esports.</p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <StatCard icon={Trophy} label="Active Tournaments" value={String(stats.tournaments)} />
        <StatCard icon={Gamepad2} label="Games Available" value={String(stats.games)} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link to="/games" className="surface-card rounded-lg p-4 flex items-center justify-between group hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Gamepad2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Browse Games</p>
                <p className="text-xs text-muted-foreground">Find your next match</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
          <Link to="/tournaments" className="surface-card rounded-lg p-4 flex items-center justify-between group hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Tournaments</p>
                <p className="text-xs text-muted-foreground">Compete for prizes</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        </div>
      </section>

      {notices.length > 0 ? (
        <section className="space-y-2">
          {notices.map((n) => (
            <div key={n.id} className="surface-card rounded-lg p-4 border-l-2 border-l-primary">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-medium">{n.title}</p>
              </div>
              <p className="text-xs text-muted-foreground">{n.content}</p>
            </div>
          ))}
        </section>
      ) : (
        <section className="surface-card rounded-lg p-4 border-l-2 border-l-primary">
          <p className="text-xs text-muted-foreground">No active notices</p>
        </section>
      )}
    </div>
  );
};

export default HomePage;