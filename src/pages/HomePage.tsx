import { Trophy, Gamepad2, ArrowRight, Bell, Plane, Wallet, Crown, Clock, Star, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import fairclashLogo from "@/assets/fairclash-logo.jpg";
import aviatorLogo from "@/assets/aviator-logo.jpg";
import { cn } from "@/lib/utils";

const HomePage = () => {
  const { user, profile } = useAuth();
  const [notices, setNotices] = useState<any[]>([]);
  const [stats, setStats] = useState({ tournaments: 0, games: 0 });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [adminUserIds, setAdminUserIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const now = new Date().toISOString();
      const [noticesRes, gamesRes, tournamentsRes, leaderRes, adminRes] = await Promise.all([
        supabase.from("notices").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(3),
        supabase.from("games").select("id").eq("is_active", true),
        supabase.from("tournaments").select("id").in("status", ["upcoming", "live"]),
        supabase.from("profiles").select("user_id, username, display_name, avatar_url, wallet_balance").eq("status", "active").order("wallet_balance", { ascending: false }).limit(10),
        supabase.from("user_roles").select("user_id").eq("role", "admin"),
      ]);

      // Filter expired notices client-side
      const activeNotices = (noticesRes.data || []).filter((n: any) => !n.expiry_at || new Date(n.expiry_at) > new Date());
      setNotices(activeNotices);
      setStats({ games: (gamesRes.data?.length || 0) + 1, tournaments: tournamentsRes.data?.length || 0 }); // +1 for Aviator
      setLeaderboard(leaderRes.data || []);
      setAdminUserIds((adminRes.data || []).map((r: any) => r.user_id));

      // Load recent games for current user
      if (user) {
        const { data: sessions } = await supabase
          .from("game_sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);
        setRecentGames(sessions || []);
      }
    };
    load();

    const channel = supabase.channel("notices-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "notices" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-card to-primary/5 border border-border p-6">
        <div className="flex items-center gap-4">
          <img src={fairclashLogo} alt="FairClash" className="h-16 w-16 rounded-2xl object-cover glow-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">FairClash Tournaments</h1>
            <p className="text-sm text-muted-foreground mt-1">Compete. Win. Withdraw.</p>
          </div>
        </div>
        {user && profile && (
          <div className="mt-4 flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 w-fit">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="font-mono-num text-sm font-semibold">₹{Number(profile.wallet_balance || 0).toFixed(2)}</span>
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <StatCard icon={Trophy} label="Active Tournaments" value={String(stats.tournaments)} />
        <StatCard icon={Gamepad2} label="Total Games" value={String(stats.games)} />
      </section>

      {/* Featured: Aviator */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Featured Game</h2>
        <Link to="/aviator" className="block surface-card rounded-xl overflow-hidden group hover:border-primary/30 transition-all">
          <div className="flex items-center gap-4 p-4">
            <img src={aviatorLogo} alt="Aviator Crash" className="h-16 w-16 rounded-xl object-cover" />
            <div className="flex-1">
              <p className="text-sm font-bold flex items-center gap-1.5">
                <Plane className="h-4 w-4 text-primary" /> Aviator Crash
              </p>
              <p className="text-xs text-muted-foreground mt-1">Bet, watch the multiplier grow, and cash out before the crash!</p>
              <div className="flex gap-1 mt-2">
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">Live</span>
                <span className="px-1.5 py-0.5 rounded bg-success/10 text-success text-[10px] font-medium">Real Money</span>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </Link>
      </section>

      {/* Recently Played */}
      {recentGames.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Recently Played
          </h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {recentGames.map((g) => (
              <div key={g.id} className="surface-card rounded-lg p-3 min-w-[140px] flex-shrink-0">
                <p className="text-xs font-medium truncate">{g.game_title}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {g.win_amount > 0 ? <span className="text-success">Won ₹{Number(g.win_amount).toFixed(0)}</span> : <span>Bet ₹{Number(g.bet_amount).toFixed(0)}</span>}
                </p>
                <p className="text-[10px] text-muted-foreground">{new Date(g.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link to="/games" className="surface-card rounded-lg p-4 flex items-center justify-between group hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Gamepad2 className="h-5 w-5 text-primary" /></div>
              <div><p className="text-sm font-medium">Browse Games</p><p className="text-xs text-muted-foreground">Find your next match</p></div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
          <Link to="/tournaments" className="surface-card rounded-lg p-4 flex items-center justify-between group hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Trophy className="h-5 w-5 text-primary" /></div>
              <div><p className="text-sm font-medium">Tournaments</p><p className="text-xs text-muted-foreground">Compete for prizes</p></div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        </div>
      </section>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5" /> Leaderboard
          </h2>
          <div className="surface-card rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {leaderboard.map((p, i) => {
                const isAdminUser = adminUserIds.includes(p.user_id);
                const avatarPublicUrl = p.avatar_url
                  ? supabase.storage.from("avatars").getPublicUrl(p.avatar_url).data.publicUrl
                  : null;
                return (
                  <div key={p.user_id} className={cn("px-4 py-3 flex items-center gap-3", isAdminUser && "bg-primary/5")}>
                    <span className={cn("text-xs font-bold w-6 text-center font-mono-num",
                      i === 0 ? "text-warning" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-warning/60" : "text-muted-foreground"
                    )}>
                      {i <= 2 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                    </span>
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                      {avatarPublicUrl ? (
                        <img src={avatarPublicUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">{(p.display_name || p.username || "?")[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate flex items-center gap-1">
                        {p.display_name || p.username}
                        {isAdminUser && <Crown className="h-3 w-3 text-primary" />}
                      </p>
                    </div>
                    <span className="font-mono-num text-xs font-semibold text-primary">₹{Number(p.wallet_balance).toFixed(0)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Notices */}
      {notices.length > 0 && (
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
      )}
    </div>
  );
};

export default HomePage;
