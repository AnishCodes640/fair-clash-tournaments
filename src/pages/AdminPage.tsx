import {
  Users, Gamepad2, Trophy, Wallet, AlertTriangle,
  TrendingUp, Ban, CreditCard, Settings, Bell,
  Shield, Upload, Plus, Search, Eye, Check, X,
  FileText, ChevronRight, Image, Moon, Sun
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

type AdminTab = "dashboard" | "users" | "payments" | "games" | "tournaments" | "notices" | "settings";

const AdminPage = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, bannedUsers: 0, totalGames: 0, tournaments: 0, pendingDeposits: 0, earnings: 0, totalWallet: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showGameForm, setShowGameForm] = useState(false);
  const [showTournamentForm, setShowTournamentForm] = useState(false);
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Game form
  const [gameTitle, setGameTitle] = useState("");
  const [gameDesc, setGameDesc] = useState("");
  const [gameType, setGameType] = useState("single_player");
  const [gameTournament, setGameTournament] = useState(false);
  const [gameMultiplayer, setGameMultiplayer] = useState(false);
  const [gameBot, setGameBot] = useState(false);
  const [gameIcon, setGameIcon] = useState<File | null>(null);
  const [gameFile, setGameFile] = useState<File | null>(null);
  const [gameMinBet, setGameMinBet] = useState("");
  const [gameMaxBet, setGameMaxBet] = useState("");
  const [gameHouseEdge, setGameHouseEdge] = useState("");
  const gameIconRef = useRef<HTMLInputElement>(null);
  const gameFileRef = useRef<HTMLInputElement>(null);

  // Tournament form
  const [tTitle, setTTitle] = useState("");
  const [tGameId, setTGameId] = useState("");
  const [tEntryFee, setTEntryFee] = useState("");
  const [tPrize, setTPrize] = useState("");
  const [tMaxPlayers, setTMaxPlayers] = useState("10");
  const [tStartTime, setTStartTime] = useState("");

  // Notice form
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");

  // Kill switch
  const [features, setFeatures] = useState<any>({});

  const loadDashboard = async () => {
    const [profilesRes, gamesRes, tournamentsRes, paymentsRes, earningsRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("games").select("*"),
      supabase.from("tournaments").select("*"),
      supabase.from("payment_requests").select("*").eq("status", "pending"),
      supabase.from("wallet_transactions").select("fee").not("fee", "is", null),
    ]);
    const profiles = profilesRes.data || [];
    const allGames = gamesRes.data || [];
    const allTournaments = tournamentsRes.data || [];
    const totalEarnings = (earningsRes.data || []).reduce((sum: number, t: any) => sum + Number(t.fee || 0), 0);
    setStats({
      totalUsers: profiles.length,
      activeUsers: profiles.filter((p: any) => p.status === "active").length,
      bannedUsers: profiles.filter((p: any) => p.status === "banned").length,
      totalGames: allGames.length,
      tournaments: allTournaments.length,
      pendingDeposits: (paymentsRes.data || []).length,
      earnings: totalEarnings,
      totalWallet: profiles.reduce((sum: number, p: any) => sum + Number(p.wallet_balance || 0), 0),
    });
    setUsers(profiles);
    setGames(allGames);
    setTournaments(allTournaments);
    setPayments(paymentsRes.data || []);

    const { data: settingsData } = await supabase.from("app_settings").select("*").eq("key", "features").single();
    if (settingsData) setFeatures(settingsData.value as any);
  };

  const loadPayments = async () => {
    const { data } = await supabase.from("payment_requests").select("*").order("created_at", { ascending: false });
    setPayments(data || []);
  };

  const loadNotices = async () => {
    const { data } = await supabase.from("notices").select("*").order("created_at", { ascending: false });
    setNotices(data || []);
  };

  useEffect(() => {
    if (isAdmin) {
      loadDashboard();
      const channel = supabase.channel("admin-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "payment_requests" }, () => { loadDashboard(); loadPayments(); })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab === "payments") loadPayments();
    if (activeTab === "notices") loadNotices();
  }, [activeTab]);

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
        <div className="surface-card rounded-lg p-8 text-center">
          <Shield className="h-8 w-8 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
          <p className="text-sm text-muted-foreground">You do not have admin privileges.</p>
        </div>
      </div>
    );
  }

  // Actions
  const handleBan = async (userId: string, ban: boolean) => {
    await supabase.from("profiles").update({ status: ban ? "banned" : "active" }).eq("user_id", userId);
    toast.success(ban ? "User banned" : "User unbanned");
    loadDashboard();
  };

  const handleWalletAdjust = async (userId: string, amount: number) => {
    const input = prompt(`Enter amount to ${amount > 0 ? "add" : "deduct"}:`);
    if (!input) return;
    const val = parseFloat(input);
    if (isNaN(val) || val <= 0) return;
    const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("user_id", userId).single();
    const newBalance = Number(profile?.wallet_balance || 0) + (amount > 0 ? val : -val);
    await supabase.from("profiles").update({ wallet_balance: Math.max(0, newBalance) }).eq("user_id", userId);
    await supabase.from("wallet_transactions").insert({
      user_id: userId,
      type: amount > 0 ? "admin_credit" : "admin_debit",
      amount: val,
      description: `Admin ${amount > 0 ? "credit" : "debit"}`,
    });
    toast.success("Wallet updated");
    loadDashboard();
  };

  const handlePayment = async (paymentId: string, approve: boolean, userId: string, amount: number) => {
    await supabase.from("payment_requests").update({
      status: approve ? "approved" : "rejected",
      reviewed_at: new Date().toISOString(),
    }).eq("id", paymentId);
    if (approve) {
      const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("user_id", userId).single();
      const newBalance = Number(profile?.wallet_balance || 0) + amount;
      await supabase.from("profiles").update({ wallet_balance: newBalance }).eq("user_id", userId);
      await supabase.from("wallet_transactions").insert({
        user_id: userId,
        type: "deposit",
        amount,
        description: "Deposit approved by admin",
      });
    }
    toast.success(approve ? "Deposit approved" : "Deposit rejected");
    loadPayments();
    loadDashboard();
  };

  const handleAddGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let iconPath = "";
      let filePath = "";
      if (gameIcon) {
        const ext = gameIcon.name.split(".").pop();
        iconPath = `${Date.now()}-icon.${ext}`;
        await supabase.storage.from("game-icons").upload(iconPath, gameIcon);
      }
      if (gameFile) {
        const ext = gameFile.name.split(".").pop();
        filePath = `${Date.now()}-game.${ext}`;
        await supabase.storage.from("game-files").upload(filePath, gameFile);
      }
      await supabase.from("games").insert({
        title: gameTitle,
        description: gameDesc,
        game_type: gameType,
        icon_url: iconPath || null,
        game_file_url: filePath || null,
        tournament_enabled: gameTournament,
        multiplayer_enabled: gameMultiplayer,
        bot_enabled: gameBot,
        min_bet: gameMinBet ? parseFloat(gameMinBet) : null,
        max_bet: gameMaxBet ? parseFloat(gameMaxBet) : null,
        house_edge: gameHouseEdge ? parseFloat(gameHouseEdge) : null,
      });
      toast.success("Game added!");
      setShowGameForm(false);
      setGameTitle(""); setGameDesc(""); setGameIcon(null); setGameFile(null);
      setGameMinBet(""); setGameMaxBet(""); setGameHouseEdge("");
      loadDashboard();
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  const handleDeleteGame = async (id: string) => {
    if (!confirm("Delete this game?")) return;
    await supabase.from("games").delete().eq("id", id);
    toast.success("Game deleted");
    loadDashboard();
  };

  const handleToggleGame = async (id: string, isActive: boolean) => {
    await supabase.from("games").update({ is_active: !isActive }).eq("id", id);
    toast.success(isActive ? "Game disabled" : "Game enabled");
    loadDashboard();
  };

  const handleAddTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supabase.from("tournaments").insert({
        title: tTitle,
        game_id: tGameId,
        entry_fee: parseFloat(tEntryFee),
        prize_pool: parseFloat(tPrize),
        max_players: parseInt(tMaxPlayers),
        start_time: tStartTime,
      });
      toast.success("Tournament created!");
      setShowTournamentForm(false);
      loadDashboard();
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  const handleAddNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from("notices").insert({ title: noticeTitle, content: noticeContent });
    toast.success("Notice posted!");
    setShowNoticeForm(false);
    setNoticeTitle(""); setNoticeContent("");
    loadNotices();
  };

  const handleKillSwitch = async (key: string) => {
    const newFeatures = { ...features, [key]: !features[key] };
    const { data: existing } = await supabase.from("app_settings").select("id").eq("key", "features").single();
    if (existing) {
      await supabase.from("app_settings").update({ value: newFeatures }).eq("key", "features");
    } else {
      await supabase.from("app_settings").insert({ key: "features", value: newFeatures });
    }
    setFeatures(newFeatures);
    toast.success(`${key} ${newFeatures[key] ? "enabled" : "disabled"}`);
  };

  const adminTabs: { id: AdminTab; label: string; icon: typeof Users }[] = [
    { id: "dashboard", label: "Dashboard", icon: TrendingUp },
    { id: "users", label: "Users", icon: Users },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "games", label: "Games", icon: Gamepad2 },
    { id: "tournaments", label: "Tournaments", icon: Trophy },
    { id: "notices", label: "Notices", icon: Bell },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const filteredUsers = users.filter((u) =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">FairClash Admin</h1>
          <p className="text-xs text-muted-foreground mt-1">Command Center</p>
        </div>
        <span className="h-8 px-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" /> Admin Only
        </span>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 overflow-x-auto bg-secondary rounded-lg p-1 no-scrollbar">
        {adminTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
              activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {tab.id === "payments" && stats.pendingDeposits > 0 && (
              <span className="ml-1 h-4 min-w-[16px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                {stats.pendingDeposits}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Users} label="Total Users" value={String(stats.totalUsers)} />
            <StatCard icon={Gamepad2} label="Total Games" value={String(stats.totalGames)} />
            <StatCard icon={Trophy} label="Tournaments" value={String(stats.tournaments)} />
            <StatCard icon={TrendingUp} label="Platform Earnings" value={`₹${stats.earnings.toFixed(2)}`} />
            <StatCard icon={Users} label="Active Users" value={String(stats.activeUsers)} />
            <StatCard icon={Ban} label="Banned Users" value={String(stats.bannedUsers)} />
            <StatCard icon={CreditCard} label="Pending Deposits" value={String(stats.pendingDeposits)} />
            <StatCard icon={Wallet} label="Total Wallet" value={`₹${stats.totalWallet.toFixed(2)}`} />
          </section>

          {/* Kill Switch */}
          <section className="surface-card rounded-lg p-4 border-l-2 border-l-destructive space-y-3">
            <p className="text-sm font-medium">Emergency Controls</p>
            <div className="flex flex-wrap gap-2">
              {["withdrawals_enabled", "games_enabled", "deposits_enabled", "tournaments_enabled"].map((key) => (
                <button
                  key={key}
                  onClick={() => handleKillSwitch(key)}
                  className={cn("h-8 px-3 rounded-md text-xs font-medium",
                    features[key] ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  )}
                >
                  {key.replace("_enabled", "").replace("_", " ")}: {features[key] ? "ON" : "OFF"}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* USERS */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 rounded-lg bg-card border border-border pl-10 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <p className="text-xs text-muted-foreground">{filteredUsers.length} users found</p>
          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <div key={u.id} className="surface-card rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{u.username}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium",
                    u.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  )}>
                    {u.status}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span className="font-mono-num">₹{Number(u.wallet_balance).toFixed(2)}</span>
                  <div className="flex gap-1">
                    <button onClick={() => handleWalletAdjust(u.user_id, 1)} className="h-7 px-2 rounded bg-success/10 text-success text-[10px] font-medium">+Credit</button>
                    <button onClick={() => handleWalletAdjust(u.user_id, -1)} className="h-7 px-2 rounded bg-warning/10 text-warning text-[10px] font-medium">-Debit</button>
                    <button
                      onClick={() => handleBan(u.user_id, u.status === "active")}
                      className={cn("h-7 px-2 rounded text-[10px] font-medium",
                        u.status === "active" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                      )}
                    >
                      {u.status === "active" ? "Ban" : "Unban"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PAYMENTS */}
      {activeTab === "payments" && (
        <div className="space-y-3">
          {payments.length === 0 ? (
            <div className="surface-card rounded-lg p-8 text-center text-sm text-muted-foreground">No payment requests</div>
          ) : payments.map((p) => (
            <div key={p.id} className="surface-card rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium font-mono-num">₹{Number(p.amount).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">User: {p.user_id.slice(0, 8)}...</p>
                </div>
                <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium",
                  p.status === "pending" ? "bg-warning/10 text-warning" : p.status === "approved" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                )}>
                  {p.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
              {p.screenshot_url && (
                <button
                  onClick={() => {
                    const url = supabase.storage.from("payment-screenshots").getPublicUrl(p.screenshot_url).data.publicUrl;
                    window.open(url, "_blank");
                  }}
                  className="mt-2 h-7 px-3 rounded bg-secondary text-xs text-foreground flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" /> View Screenshot
                </button>
              )}
              {p.status === "pending" && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handlePayment(p.id, true, p.user_id, p.amount)} className="flex-1 h-8 rounded-md bg-success text-success-foreground text-xs font-medium flex items-center justify-center gap-1">
                    <Check className="h-3 w-3" /> Approve
                  </button>
                  <button onClick={() => handlePayment(p.id, false, p.user_id, p.amount)} className="flex-1 h-8 rounded-md bg-destructive text-destructive-foreground text-xs font-medium flex items-center justify-center gap-1">
                    <X className="h-3 w-3" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* GAMES */}
      {activeTab === "games" && (
        <div className="space-y-4">
          <button onClick={() => setShowGameForm(!showGameForm)} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-2">
            <Plus className="h-3.5 w-3.5" /> Add Game
          </button>

          {showGameForm && (
            <form onSubmit={handleAddGame} className="surface-card rounded-lg p-4 space-y-3">
              <input type="text" placeholder="Game Title" value={gameTitle} onChange={(e) => setGameTitle(e.target.value)} required
                className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              <textarea placeholder="Description" value={gameDesc} onChange={(e) => setGameDesc(e.target.value)}
                className="w-full h-20 rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
              <select value={gameType} onChange={(e) => setGameType(e.target.value)}
                className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="single_player">Single Player</option>
                <option value="multiplayer">Multiplayer</option>
                <option value="bot_based">Bot Based</option>
                <option value="prediction">Prediction</option>
              </select>
              <div className="flex flex-wrap gap-4 text-xs">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={gameTournament} onChange={(e) => setGameTournament(e.target.checked)} className="accent-primary" />
                  Tournament
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={gameMultiplayer} onChange={(e) => setGameMultiplayer(e.target.checked)} className="accent-primary" />
                  Multiplayer
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={gameBot} onChange={(e) => setGameBot(e.target.checked)} className="accent-primary" />
                  Bot
                </label>
              </div>

              {/* Bet/Edge controls */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Min Bet</label>
                  <input type="number" placeholder="₹" value={gameMinBet} onChange={(e) => setGameMinBet(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Max Bet</label>
                  <input type="number" placeholder="₹" value={gameMaxBet} onChange={(e) => setGameMaxBet(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">House Edge %</label>
                  <input type="number" placeholder="%" value={gameHouseEdge} onChange={(e) => setGameHouseEdge(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input type="file" ref={gameIconRef} accept="image/*" onChange={(e) => setGameIcon(e.target.files?.[0] || null)} className="hidden" />
                  <button type="button" onClick={() => gameIconRef.current?.click()}
                    className="w-full h-10 rounded-lg border border-dashed border-border text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                    <Image className="h-3.5 w-3.5" /> {gameIcon ? gameIcon.name : "Game Icon"}
                  </button>
                </div>
                <div>
                  <input type="file" ref={gameFileRef} accept=".html,.zip,.js" onChange={(e) => setGameFile(e.target.files?.[0] || null)} className="hidden" />
                  <button type="button" onClick={() => gameFileRef.current?.click()}
                    className="w-full h-10 rounded-lg border border-dashed border-border text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                    <Upload className="h-3.5 w-3.5" /> {gameFile ? gameFile.name : "Game File (.html)"}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {loading ? "Adding..." : "Add Game"}
              </button>
            </form>
          )}

          <div className="space-y-2">
            {games.map((g) => (
              <div key={g.id} className="surface-card rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                    {g.icon_url ? (
                      <img src={supabase.storage.from("game-icons").getPublicUrl(g.icon_url).data.publicUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Gamepad2 className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{g.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{g.game_type.replace("_", " ")}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleToggleGame(g.id, g.is_active)}
                    className={cn("h-7 px-2 rounded text-[10px] font-medium",
                      g.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    )}>
                    {g.is_active ? "Active" : "Disabled"}
                  </button>
                  <button onClick={() => handleDeleteGame(g.id)} className="h-7 px-2 rounded bg-destructive/10 text-destructive text-[10px] font-medium">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TOURNAMENTS */}
      {activeTab === "tournaments" && (
        <div className="space-y-4">
          <button onClick={() => setShowTournamentForm(!showTournamentForm)} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-2">
            <Plus className="h-3.5 w-3.5" /> Create Tournament
          </button>

          {showTournamentForm && (
            <form onSubmit={handleAddTournament} className="surface-card rounded-lg p-4 space-y-3">
              <input type="text" placeholder="Tournament Title" value={tTitle} onChange={(e) => setTTitle(e.target.value)} required
                className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              <select value={tGameId} onChange={(e) => setTGameId(e.target.value)} required
                className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Select Game</option>
                {games.filter((g) => g.tournament_enabled).map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-3">
                <input type="number" placeholder="Entry Fee" value={tEntryFee} onChange={(e) => setTEntryFee(e.target.value)} required
                  className="h-10 rounded-lg bg-background border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                <input type="number" placeholder="Prize Pool" value={tPrize} onChange={(e) => setTPrize(e.target.value)} required
                  className="h-10 rounded-lg bg-background border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                <input type="number" placeholder="Max Players" value={tMaxPlayers} onChange={(e) => setTMaxPlayers(e.target.value)} required
                  className="h-10 rounded-lg bg-background border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <input type="datetime-local" value={tStartTime} onChange={(e) => setTStartTime(e.target.value)} required
                className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              <button type="submit" disabled={loading}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {loading ? "Creating..." : "Create Tournament"}
              </button>
            </form>
          )}

          <div className="space-y-2">
            {tournaments.map((t) => (
              <div key={t.id} className="surface-card rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{t.title}</p>
                  <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium",
                    t.status === "upcoming" ? "bg-primary/10 text-primary" : t.status === "live" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  )}>{t.status}</span>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Entry: ₹{Number(t.entry_fee).toFixed(0)}</span>
                  <span>Prize: ₹{Number(t.prize_pool).toFixed(0)}</span>
                  <span>{t.current_players}/{t.max_players} players</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NOTICES */}
      {activeTab === "notices" && (
        <div className="space-y-4">
          <button onClick={() => setShowNoticeForm(!showNoticeForm)} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-2">
            <Plus className="h-3.5 w-3.5" /> Post Notice
          </button>

          {showNoticeForm && (
            <form onSubmit={handleAddNotice} className="surface-card rounded-lg p-4 space-y-3">
              <input type="text" placeholder="Notice Title" value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} required
                className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              <textarea placeholder="Notice Content" value={noticeContent} onChange={(e) => setNoticeContent(e.target.value)} required
                className="w-full h-20 rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
              <button type="submit" className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Post Notice</button>
            </form>
          )}

          <div className="space-y-2">
            {notices.map((n) => (
              <div key={n.id} className="surface-card rounded-lg p-4 border-l-2 border-l-primary">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{n.content}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {activeTab === "settings" && (
        <div className="surface-card rounded-lg p-4 space-y-4">
          <p className="text-sm font-medium">Platform Settings</p>
          <div className="space-y-3 text-xs text-muted-foreground">
            <p>Commission Rate: <span className="text-foreground font-medium">40%</span></p>
            <p>Min Deposit: <span className="text-foreground font-medium">₹50</span></p>
            <p>Min Withdrawal: <span className="text-foreground font-medium">₹100</span></p>
            <p>Platform: <span className="text-foreground font-medium">FairClash Tournaments</span></p>
            <p>Powered by: <span className="text-foreground font-medium">Fair Fun Studios</span></p>
            <p>Admin: <span className="text-foreground font-medium">ganish36912@gmail.com</span></p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;