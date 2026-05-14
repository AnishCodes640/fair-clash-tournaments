import { Crown, Gamepad2, Trophy, Wallet, TrendingUp, Target, Medal, Award, Flame, Users, MessageCircle, Search, ExternalLink, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedAvatar } from "@/components/ThemedAvatar";
import { ProgressBadge } from "@/components/ProgressBadge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { LeaderboardSkeleton } from "@/components/LeaderboardSkeleton";
import { getTheme } from "@/lib/themes";
import { SEO } from "@/components/SEO";

type RankingType = "balance" | "wins" | "games" | "total_bets" | "total_winnings";
type Period = "global" | "weekly" | "monthly";

interface PlayerData {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  active_theme: string | null;
  wallet_balance: number;
  totalGames: number;
  wins: number;
  losses: number;
  totalBets: number;
  totalWinnings: number;
  isAdmin: boolean;
  level: string;
  xp: number;
  streak: number;
  bestStreak: number;
  verifiedTier: string | null;
  achievements: any[];
}

const LEVEL_THRESHOLDS: Record<string, number> = { bronze: 200, silver: 500, gold: 1200, diamond: 3000 };
const NEXT_LEVEL: Record<string, string> = { bronze: "silver", silver: "gold", gold: "diamond", diamond: "diamond" };

// In-memory cache to avoid loading flicker when switching periods
const cache = new Map<Period, PlayerData[]>();

const LeaderboardPage = () => {
  const { user } = useAuth();
  const [players, setPlayers] = useState<PlayerData[]>(() => cache.get("global") || []);
  const [ranking, setRanking] = useState<RankingType>("balance");
  const [period, setPeriod] = useState<Period>("global");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(!cache.has("global"));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const cached = cache.get(period);
      if (cached) { setPlayers(cached); setLoading(false); }
      else setLoading(true);

      const since = period === "weekly"
        ? new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
        : period === "monthly"
        ? new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
        : null;
      let sessQ = supabase.from("game_sessions").select("user_id, result, bet_amount, win_amount, created_at");
      if (since) sessQ = sessQ.gte("created_at", since);
      const [profilesRes, sessionsRes, rolesRes, progRes, verRes] = await Promise.all([
        supabase.rpc("get_public_leaderboard"),
        sessQ,
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("player_progression").select("user_id, level, xp, current_streak, best_streak, achievements"),
        supabase.from("user_verifications").select("user_id, tier, expires_at"),
      ]);

      if (cancelled) return;

      const profiles = profilesRes.data || [];
      const sessions = sessionsRes.data || [];
      const roles = rolesRes.data || [];
      const progs = progRes.data || [];
      const vers = verRes.data || [];

      const adminSet = new Set(roles.filter((r: any) => r.role === "admin").map((r: any) => r.user_id));
      const progMap: Record<string, any> = {};
      progs.forEach((p: any) => { progMap[p.user_id] = p; });
      const verMap: Record<string, string> = {};
      const now = Date.now();
      vers.forEach((v: any) => { if (new Date(v.expires_at).getTime() > now) verMap[v.user_id] = v.tier; });

      const statsMap: Record<string, any> = {};
      sessions.forEach((s: any) => {
        if (!statsMap[s.user_id]) statsMap[s.user_id] = { totalGames: 0, wins: 0, losses: 0, totalBets: 0, totalWinnings: 0 };
        statsMap[s.user_id].totalGames++;
        if (s.result === "win" || s.result === "won") statsMap[s.user_id].wins++;
        if (s.result === "loss" || s.result === "lost") statsMap[s.user_id].losses++;
        statsMap[s.user_id].totalBets += Number(s.bet_amount || 0);
        statsMap[s.user_id].totalWinnings += Number(s.win_amount || 0);
      });

      const enriched: PlayerData[] = profiles.map((p: any) => ({
        user_id: p.user_id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        active_theme: p.active_theme,
        wallet_balance: Number(p.wallet_balance || 0),
        totalGames: statsMap[p.user_id]?.totalGames || 0,
        wins: statsMap[p.user_id]?.wins || 0,
        losses: statsMap[p.user_id]?.losses || 0,
        totalBets: statsMap[p.user_id]?.totalBets || 0,
        totalWinnings: statsMap[p.user_id]?.totalWinnings || 0,
        isAdmin: adminSet.has(p.user_id),
        level: progMap[p.user_id]?.level || "bronze",
        xp: progMap[p.user_id]?.xp || 0,
        streak: progMap[p.user_id]?.current_streak || 0,
        bestStreak: progMap[p.user_id]?.best_streak || 0,
        verifiedTier: verMap[p.user_id] || null,
        achievements: Array.isArray(progMap[p.user_id]?.achievements) ? progMap[p.user_id].achievements : [],
      }));

      cache.set(period, enriched);
      setPlayers(enriched);
      setLoading(false);
    };
    load();

    const channel = supabase.channel("leaderboard-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => { cache.delete(period); load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "game_sessions" }, () => { cache.delete(period); load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "player_progression" }, () => { cache.delete(period); load(); })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [period]);

  const sortedPlayers = useMemo(() => [...players].sort((a, b) => {
    switch (ranking) {
      case "balance": return b.wallet_balance - a.wallet_balance;
      case "wins": return b.wins - a.wins;
      case "games": return b.totalGames - a.totalGames;
      case "total_bets": return b.totalBets - a.totalBets;
      case "total_winnings": return b.totalWinnings - a.totalWinnings;
      default: return 0;
    }
  }), [players, ranking]);

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
    const { data } = await supabase
      .from("game_sessions").select("*").eq("user_id", p.user_id)
      .order("created_at", { ascending: false }).limit(20);
    setSelectedHistory(data || []);
  };

  return (
    <>
      <SEO title="Leaderboard — Top Players on FairClash" description="See the top players on FairClash with global, weekly and monthly rankings, podium positions, win streaks and XP tiers." path="/leaderboard" />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 animate-fade-in pb-24">
      <div className="flex items-center gap-2">
        <Crown className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold tracking-tight">Leaderboard</h1>
        <span className="ml-auto text-xs text-muted-foreground font-mono-num">{players.length} players</span>
      </div>

      {/* Social shortcuts */}
      <div className="grid grid-cols-2 gap-2">
        <Link to="/social" className="surface-card rounded-xl p-3 flex items-center gap-3 hover:border-primary/30 transition-colors">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">Social</p>
            <p className="text-[10px] text-muted-foreground">Friends, chats & feed</p>
          </div>
          <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
        <Link to="/search" className="surface-card rounded-xl p-3 flex items-center gap-3 hover:border-primary/30 transition-colors">
          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">Search</p>
            <p className="text-[10px] text-muted-foreground">Find any player by name</p>
          </div>
        </Link>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1">
        {(["global","weekly","monthly"] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={cn("flex-1 px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all",
              period === p ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>{p}</button>
        ))}
      </div>

      {loading && players.length === 0 ? (
        <LeaderboardSkeleton />
      ) : (
        <>
          {/* Podium */}
          {sortedPlayers.length > 0 && <Podium players={sortedPlayers.slice(0, 3)} onSelect={handleSelectPlayer} getValue={getValue} />}

          {/* Ranking tabs */}
          <div className="flex gap-1 overflow-x-auto bg-secondary rounded-xl p-1 no-scrollbar">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setRanking(tab.id)}
                className={cn("flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                  ranking === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <tab.icon className="h-3.5 w-3.5" />{tab.label}
              </button>
            ))}
          </div>

          {/* Selected player drawer */}
          {selectedPlayer && (
            <PlayerDetail player={selectedPlayer} history={selectedHistory} onClose={() => { setSelectedPlayer(null); setSelectedHistory([]); }} />
          )}

          {/* Rankings list */}
          <div className="space-y-2">
            {sortedPlayers.slice(3).map((p, idx) => {
              const rank = idx + 4;
              const isCurrentUser = user?.id === p.user_id;
              return (
                <PlayerCard key={p.user_id} player={p} rank={rank} isCurrentUser={isCurrentUser}
                  value={getValue(p)} onSelect={() => handleSelectPlayer(p)} />
              );
            })}
            {sortedPlayers.length === 0 && (
              <div className="surface-card rounded-2xl px-4 py-12 text-center text-sm text-muted-foreground">No players yet</div>
            )}
          </div>
        </>
      )}
    </div>
    </>
  );
};

function Podium({ players, onSelect, getValue }: { players: PlayerData[]; onSelect: (p: PlayerData) => void; getValue: (p: PlayerData) => string }) {
  // Order on screen: 2nd, 1st, 3rd
  const order = [players[1], players[0], players[2]].filter(Boolean);
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 items-end">
      {order.map((p) => {
        const idx = players.indexOf(p);
        return <PodiumCard key={p.user_id} player={p} place={idx} value={getValue(p)} onClick={() => onSelect(p)} />;
      })}
    </div>
  );
}

function PodiumCard({ player, place, value, onClick }: { player: PlayerData; place: number; value: string; onClick: () => void }) {
  const theme = getTheme(player.active_theme);
  const avatarUrl = player.avatar_url ? supabase.storage.from("avatars").getPublicUrl(player.avatar_url).data.publicUrl : null;
  const podiumClass = place === 0 ? "podium-gold" : place === 1 ? "podium-silver" : "podium-bronze";
  const heightClass = place === 0 ? "min-h-[180px] sm:min-h-[200px]" : "min-h-[148px] sm:min-h-[164px]";
  const sizeAvatar = place === 0 ? 64 : 52;
  const rankLabel = place === 0 ? "1st" : place === 1 ? "2nd" : "3rd";

  return (
    <button onClick={onClick}
      className={cn("relative rounded-2xl p-3 pt-6 flex flex-col items-center justify-end text-center bg-card overflow-hidden",
        heightClass, podiumClass, theme.glowClass)}>
      {place === 0 && (
        <Crown className="absolute top-1 left-1/2 -translate-x-1/2 h-5 w-5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
      )}
      <span className="absolute top-2 right-2 text-[9px] font-bold font-mono-num px-1.5 py-0.5 rounded-md bg-background/60 backdrop-blur-sm">
        {rankLabel}
      </span>
      <ThemedAvatar src={avatarUrl} name={player.display_name || player.username} themeId={player.active_theme} variant="box" size={sizeAvatar} />
      <p className="text-[11px] sm:text-xs font-bold mt-2 truncate max-w-full flex items-center gap-1 justify-center">
        {player.display_name || player.username}
        <VerifiedBadge tier={player.verifiedTier} size={11} />
      </p>
      <div className="flex items-center gap-1 mt-1">
        <ProgressBadge level={player.level} className="!text-[8px] !px-1.5 !py-0" />
      </div>
      <p className="text-[11px] font-mono-num text-primary font-bold mt-1">{value}</p>
      {player.streak >= 3 && (
        <p className="text-[9px] flex items-center gap-0.5 text-orange-400 font-semibold mt-0.5">
          <Flame className="h-2.5 w-2.5" />{player.streak} streak
        </p>
      )}
    </button>
  );
}

function PlayerCard({ player, rank, isCurrentUser, value, onSelect }: {
  player: PlayerData; rank: number; isCurrentUser: boolean; value: string; onSelect: () => void;
}) {
  const theme = getTheme(player.active_theme);
  const avatarUrl = player.avatar_url ? supabase.storage.from("avatars").getPublicUrl(player.avatar_url).data.publicUrl : null;
  const next = NEXT_LEVEL[player.level] || "diamond";
  const threshold = LEVEL_THRESHOLDS[next] || 1200;
  const progress = Math.min(100, (player.xp / threshold) * 100);
  const winRate = player.totalGames > 0 ? Math.round((player.wins / player.totalGames) * 100) : 0;

  return (
    <button onClick={onSelect}
      className={cn(
        "w-full surface-card rounded-2xl p-3 flex items-center gap-3 text-left transition-all hover:translate-x-0.5 hover:border-primary/30",
        theme.rowClass,
        isCurrentUser && "ring-1 ring-primary/40",
        player.isAdmin && "border-red-500/30 bg-red-500/5"
      )}>
      <span className="w-6 text-center font-mono-num font-bold text-xs text-muted-foreground">#{rank}</span>
      <ThemedAvatar src={avatarUrl} name={player.display_name || player.username} themeId={player.active_theme} variant="box" size={48} />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={cn("text-sm font-bold truncate flex items-center gap-1", player.isAdmin && "text-red-500")}>
            {player.display_name || player.username}
            <VerifiedBadge tier={player.verifiedTier} size={12} />
          </p>
          {player.isAdmin && (
            <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 text-[8px] font-bold tracking-wider uppercase">Admin</span>
          )}
          {isCurrentUser && <span className="text-[9px] text-primary font-bold uppercase">You</span>}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
          <ProgressBadge level={player.level} className="!text-[9px] !px-1.5 !py-0" />
          <span className="font-mono-num">{player.totalGames}G · {winRate}% WR</span>
          {player.streak >= 3 && (
            <span className="flex items-center gap-0.5 text-orange-400 font-semibold">
              <Flame className="h-3 w-3" />{player.streak}
            </span>
          )}
          {player.achievements.length > 0 && (
            <span className="flex items-center gap-0.5 text-primary font-semibold">
              <Award className="h-3 w-3" />{player.achievements.length}
            </span>
          )}
        </div>
        {/* XP progress bar */}
        <div className="h-1 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <span className="font-mono-num text-sm font-bold text-primary whitespace-nowrap">{value}</span>
    </button>
  );
}

function PlayerDetail({ player, history, onClose }: { player: PlayerData; history: any[]; onClose: () => void }) {
  const avatarUrl = player.avatar_url ? supabase.storage.from("avatars").getPublicUrl(player.avatar_url).data.publicUrl : null;
  const winRate = player.totalGames > 0 ? Math.round((player.wins / player.totalGames) * 100) : 0;

  return (
    <div className={cn("surface-card rounded-2xl p-4 space-y-3 animate-fade-in border",
      player.isAdmin ? "border-red-500/30" : "border-primary/20")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ThemedAvatar src={avatarUrl} name={player.display_name || player.username} themeId={player.active_theme} variant="box" size={56} />
          <div>
            <p className={cn("text-sm font-bold flex items-center gap-1.5", player.isAdmin && "text-red-500")}>
              {player.display_name || player.username}
              <VerifiedBadge tier={player.verifiedTier} size={14} />
            </p>
            <p className="text-[10px] text-muted-foreground">Win rate: {winRate}% · Best streak: {player.bestStreak}</p>
          </div>
        </div>
        <button onClick={onClose} className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <StatBox icon={Gamepad2} value={String(player.totalGames)} label="Games" />
        <StatBox icon={Trophy} value={String(player.wins)} label="Wins" color="text-success" />
        <StatBox icon={Target} value={String(player.losses)} label="Losses" color="text-destructive" />
        <StatBox icon={Target} value={`₹${player.totalBets.toFixed(0)}`} label="Bets" color="text-primary" />
        <StatBox icon={TrendingUp} value={`₹${player.totalWinnings.toFixed(0)}`} label="Winnings" color="text-warning" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link to={`/u/${player.user_id}`} className="h-9 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
          <ExternalLink className="h-3 w-3" /> Full Profile
        </Link>
        <Link to={`/chat/${player.user_id}`} className="h-9 rounded-lg border border-border text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-accent transition-colors">
          <MessageCircle className="h-3 w-3" /> Message
        </Link>
      </div>
      {history.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Recent Games</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {history.map((g: any) => (
              <div key={g.id} className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-md bg-secondary/50">
                <span className="truncate max-w-[120px]">{g.game_title}</span>
                <div className="flex items-center gap-2">
                  {Number(g.bet_amount) > 0 && <span className="text-muted-foreground">₹{Number(g.bet_amount).toFixed(0)}</span>}
                  <span className={cn("font-medium px-1.5 py-0.5 rounded",
                    (g.result === "win" || g.result === "won") ? "bg-success/10 text-success" :
                    (g.result === "loss" || g.result === "lost") ? "bg-destructive/10 text-destructive" : "text-muted-foreground"
                  )}>{(g.result === "win" || g.result === "won") ? "Win" : (g.result === "loss" || g.result === "lost") ? "Loss" : g.result}</span>
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
    <div className="surface-card rounded-lg p-2.5 text-center">
      <Icon className={cn("h-3.5 w-3.5 mx-auto mb-1", color || "text-muted-foreground")} />
      <p className={cn("text-xs font-bold font-mono-num", color)}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default LeaderboardPage;
