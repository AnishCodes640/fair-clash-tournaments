import { Crown, User, Gamepad2, Trophy, Wallet, TrendingUp, Target, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type RankingType = "balance" | "wins" | "games" | "total_bets" | "total_winnings";

interface PlayerData {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  wallet_balance: number;
  totalGames: number;
  wins: number;
  losses: number;
  totalBets: number;
  totalWinnings: number;
  isAdmin: boolean;
}

const LeaderboardPage = () => {
  const { user } = useAuth();
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [ranking, setRanking] = useState<RankingType>("balance");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [profilesRes, sessionsRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("user_id, username, display_name, avatar_url, wallet_balance").eq("status", "active"),
        supabase.from("game_sessions").select("user_id, result, bet_amount, win_amount"),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      const profiles = profilesRes.data || [];
      const sessions = sessionsRes.data || [];
      const roles = rolesRes.data || [];

      const adminSet = new Set(roles.filter((r: any) => r.role === "admin").map((r: any) => r.user_id));

      const statsMap: Record<string, { totalGames: number; wins: number; losses: number; totalBets: number; totalWinnings: number }> = {};
      sessions.forEach((s: any) => {
        if (!statsMap[s.user_id]) statsMap[s.user_id] = { totalGames: 0, wins: 0, losses: 0, totalBets: 0, totalWinnings: 0 };
        statsMap[s.user_id].totalGames++;
        if (s.result === "win") statsMap[s.user_id].wins++;
        if (s.result === "loss") statsMap[s.user_id].losses++;
        statsMap[s.user_id].totalBets += Number(s.bet_amount || 0);
        statsMap[s.user_id].totalWinnings += Number(s.win_amount || 0);
      });

      const enriched: PlayerData[] = profiles.map((p: any) => ({
        user_id: p.user_id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        wallet_balance: Number(p.wallet_balance || 0),
        totalGames: statsMap[p.user_id]?.totalGames || 0,
        wins: statsMap[p.user_id]?.wins || 0,
        losses: statsMap[p.user_id]?.losses || 0,
        totalBets: statsMap[p.user_id]?.totalBets || 0,
        totalWinnings: statsMap[p.user_id]?.totalWinnings || 0,
        isAdmin: adminSet.has(p.user_id),
      }));

      setPlayers(enriched);
      setLoading(false);
    };
    load();

    const channel = supabase.channel("leaderboard-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "game_sessions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const sortedPlayers = [...players].sort((a, b) => {
    switch (ranking) {
      case "balance": return b.wallet_balance - a.wallet_balance;
      case "wins": return b.wins - a.wins;
      case "games": return b.totalGames - a.totalGames;
      case "total_bets": return b.totalBets - a.totalBets;
      case "total_winnings": return b.totalWinnings - a.totalWinnings;
      default: return 0;
    }
  });

  const getValue = (p: PlayerData) => {
    switch (ranking) {
      case "balance": return `₹${p.wallet_balance.toFixed(0)}`;
      case "wins": return `${p.wins} wins`;
      case "games": return `${p.totalGames} games`;
      case "total_bets": return `₹${p.totalBets.toFixed(0)}`;
      case "total_winnings": return `₹${p.totalWinnings.toFixed(0)}`;
    }
  };

  const tabs: { id: RankingType; label: string; icon: typeof Crown }[] = [
    { id: "balance", label: "Balance", icon: Wallet },
    { id: "wins", label: "Wins", icon: Trophy },
    { id: "games", label: "Games", icon: Gamepad2 },
    { id: "total_bets", label: "Bets", icon: Target },
    { id: "total_winnings", label: "Winnings", icon: TrendingUp },
  ];

  const handleSelectPlayer = async (p: PlayerData) => {
    setSelectedPlayer(p);
    // Load game history for this player
    const { data } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("user_id", p.user_id)
      .order("created_at", { ascending: false })
      .limit(20);
    setSelectedHistory(data || []);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Crown className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold tracking-tight">Leaderboard</h1>
        <span className="ml-auto text-xs text-muted-foreground font-mono-num">{players.length} players</span>
      </div>

      {/* Ranking tabs */}
      <div className="flex gap-1 overflow-x-auto bg-secondary rounded-lg p-1 no-scrollbar">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setRanking(tab.id)}
            className={cn("flex items-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
              ranking === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            <tab.icon className="h-3.5 w-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {/* Selected player detail */}
      {selectedPlayer && (
        <PlayerDetail player={selectedPlayer} history={selectedHistory} onClose={() => { setSelectedPlayer(null); setSelectedHistory([]); }} />
      )}

      {/* Rankings list */}
      {loading ? (
        <div className="surface-card rounded-xl p-12 text-center text-sm text-muted-foreground">Loading rankings...</div>
      ) : (
        <div className="surface-card rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {sortedPlayers.map((p, i) => {
              const isCurrentUser = user?.id === p.user_id;
              const avatarUrl = p.avatar_url ? supabase.storage.from("avatars").getPublicUrl(p.avatar_url).data.publicUrl : null;
              return (
                <button key={p.user_id} onClick={() => handleSelectPlayer(p)}
                  className={cn("w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-accent/50 transition-colors",
                    isCurrentUser && "bg-primary/5",
                    p.isAdmin && "bg-warning/5")}>
                  <span className={cn("text-xs font-bold w-7 text-center font-mono-num",
                    i === 0 ? "text-warning" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-warning/60" : "text-muted-foreground")}>
                    {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                    {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> :
                      <span className="text-xs font-bold text-muted-foreground">{(p.display_name || p.username || "?")[0].toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate flex items-center gap-1", p.isAdmin && "text-warning")}>
                      {p.display_name || p.username}
                      {p.isAdmin && <Shield className="h-3 w-3 text-warning" />}
                      {isCurrentUser && <span className="text-[10px] text-primary">(you)</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{p.totalGames} games · {p.wins}W/{p.losses}L</p>
                  </div>
                  <span className="font-mono-num text-xs font-semibold text-primary">{getValue(p)}</span>
                </button>
              );
            })}
            {sortedPlayers.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No players yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function PlayerDetail({ player, history, onClose }: { player: PlayerData; history: any[]; onClose: () => void }) {
  const avatarUrl = player.avatar_url ? supabase.storage.from("avatars").getPublicUrl(player.avatar_url).data.publicUrl : null;
  const winRate = player.totalGames > 0 ? ((player.wins / player.totalGames) * 100).toFixed(0) : "0";

  return (
    <div className="surface-card rounded-xl p-4 space-y-3 animate-fade-in border border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className={cn("text-sm font-semibold flex items-center gap-1.5", player.isAdmin && "text-warning")}>
              {player.display_name || player.username}
              {player.isAdmin && <span className="px-1.5 py-0.5 rounded bg-warning/10 text-warning text-[10px] font-medium">Admin</span>}
            </p>
            <p className="text-[10px] text-muted-foreground">Win rate: {winRate}%</p>
          </div>
        </div>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <StatBox icon={Gamepad2} value={String(player.totalGames)} label="Games" />
        <StatBox icon={Trophy} value={String(player.wins)} label="Wins" color="text-success" />
        <StatBox icon={Target} value={String(player.losses)} label="Losses" color="text-destructive" />
        <StatBox icon={Target} value={`₹${player.totalBets.toFixed(0)}`} label="Total Bets" color="text-primary" />
        <StatBox icon={TrendingUp} value={`₹${player.totalWinnings.toFixed(0)}`} label="Winnings" color="text-warning" />
      </div>

      {/* Game History */}
      {history.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold mb-2">Recent Games</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {history.map((g: any) => (
              <div key={g.id} className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-md bg-secondary/50">
                <span className="truncate max-w-[120px]">{g.game_title}</span>
                <div className="flex items-center gap-2">
                  {Number(g.bet_amount) > 0 && <span className="text-muted-foreground">₹{Number(g.bet_amount).toFixed(0)}</span>}
                  <span className={cn("font-medium px-1.5 py-0.5 rounded",
                    g.result === "win" ? "bg-success/10 text-success" : g.result === "loss" ? "bg-destructive/10 text-destructive" : "text-muted-foreground"
                  )}>{g.result === "win" ? "Win" : g.result === "loss" ? "Loss" : g.result}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ icon: Icon, value, label, color }: { icon: any; value: string; label: string; color?: string }) {
  return (
    <div className="bg-secondary rounded-lg p-2 text-center">
      <Icon className={cn("h-3.5 w-3.5 mx-auto mb-1", color || "text-muted-foreground")} />
      <p className={cn("text-sm font-bold font-mono-num", color)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default LeaderboardPage;
