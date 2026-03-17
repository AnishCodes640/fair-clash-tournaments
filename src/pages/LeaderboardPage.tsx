import { Crown, User, Shield, Gamepad2, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const LeaderboardPage = () => {
  const { user } = useAuth();
  const [players, setPlayers] = useState<any[]>([]);
  const [adminUserIds, setAdminUserIds] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [playerStats, setPlayerStats] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const [profilesRes, adminsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("status", "active").order("wallet_balance", { ascending: false }).limit(50),
        supabase.from("user_roles").select("user_id").eq("role", "admin"),
      ]);
      const admins = (adminsRes.data || []).map((r: any) => r.user_id);
      setAdminUserIds(admins);

      // Sort: admins first, then by balance
      const sorted = (profilesRes.data || []).sort((a: any, b: any) => {
        const aAdmin = admins.includes(a.user_id);
        const bAdmin = admins.includes(b.user_id);
        if (aAdmin && !bAdmin) return -1;
        if (!aAdmin && bAdmin) return 1;
        return Number(b.wallet_balance) - Number(a.wallet_balance);
      });
      setPlayers(sorted);
    };
    load();
  }, []);

  const handlePlayerClick = async (player: any) => {
    setSelectedPlayer(player);
    const { data: sessions } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("user_id", player.user_id)
      .order("created_at", { ascending: false })
      .limit(20);
    const totalGames = sessions?.length || 0;
    const wins = sessions?.filter((s: any) => s.result === "win").length || 0;
    setPlayerStats({ totalGames, wins, losses: totalGames - wins });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Crown className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold tracking-tight">Leaderboard</h1>
      </div>

      {/* Selected player modal */}
      {selectedPlayer && (
        <div className="surface-card rounded-xl p-4 space-y-3 animate-fade-in border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                {selectedPlayer.avatar_url ? (
                  <img src={supabase.storage.from("avatars").getPublicUrl(selectedPlayer.avatar_url).data.publicUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold flex items-center gap-1">
                  {selectedPlayer.display_name || selectedPlayer.username}
                  {adminUserIds.includes(selectedPlayer.user_id) && <Shield className="h-3 w-3 text-primary" />}
                </p>
                {selectedPlayer.bio && <p className="text-[10px] text-muted-foreground">{selectedPlayer.bio}</p>}
              </div>
            </div>
            <button onClick={() => setSelectedPlayer(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
          </div>
          {playerStats && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-secondary rounded-lg p-2 text-center">
                <Gamepad2 className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm font-bold font-mono-num">{playerStats.totalGames}</p>
                <p className="text-[10px] text-muted-foreground">Games</p>
              </div>
              <div className="bg-secondary rounded-lg p-2 text-center">
                <Trophy className="h-3.5 w-3.5 mx-auto text-success mb-1" />
                <p className="text-sm font-bold font-mono-num text-success">{playerStats.wins}</p>
                <p className="text-[10px] text-muted-foreground">Wins</p>
              </div>
              <div className="bg-secondary rounded-lg p-2 text-center">
                <p className="text-sm font-bold font-mono-num text-destructive mt-4">{playerStats.losses}</p>
                <p className="text-[10px] text-muted-foreground">Losses</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rankings */}
      <div className="surface-card rounded-xl overflow-hidden">
        <div className="divide-y divide-border">
          {players.map((p, i) => {
            const isAdminUser = adminUserIds.includes(p.user_id);
            const isCurrentUser = user?.id === p.user_id;
            const avatarUrl = p.avatar_url ? supabase.storage.from("avatars").getPublicUrl(p.avatar_url).data.publicUrl : null;
            return (
              <button key={p.user_id} onClick={() => handlePlayerClick(p)}
                className={cn("w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-accent/50 transition-colors",
                  isAdminUser && "bg-primary/5", isCurrentUser && "bg-accent/30")}>
                <span className={cn("text-xs font-bold w-7 text-center font-mono-num",
                  i === 0 ? "text-warning" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-warning/60" : "text-muted-foreground")}>
                  {i <= 2 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                </span>
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> :
                    <span className="text-xs font-bold text-muted-foreground">{(p.display_name || p.username || "?")[0].toUpperCase()}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate flex items-center gap-1">
                    {p.display_name || p.username}
                    {isAdminUser && <Crown className="h-3 w-3 text-primary" />}
                    {isCurrentUser && <span className="text-[10px] text-primary">(you)</span>}
                  </p>
                </div>
                <span className="font-mono-num text-xs font-semibold text-primary">₹{Number(p.wallet_balance).toFixed(0)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
