import { User, Mail, Calendar, LogIn, LogOut, Shield, Wallet, Camera, Save, Edit2, Gamepad2, Trophy, Target, TrendingUp, Settings, Palette, ShoppingCart, Flame, Award } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ProgressBadge } from "@/components/ProgressBadge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ThemedAvatar } from "@/components/ThemedAvatar";

const ProfilePage = () => {
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ games: 0, wins: 0, losses: 0, totalBets: 0, totalWinnings: 0 });
  const [progression, setProgression] = useState<any>(null);
  const [verification, setVerification] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const loadHistory = async () => {
      const { data } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      const sessions = data || [];
      setGameHistory(sessions);
      setStats({
        games: sessions.length,
        wins: sessions.filter((s: any) => s.result === "win").length,
        losses: sessions.filter((s: any) => s.result === "loss").length,
        totalBets: sessions.reduce((sum: number, s: any) => sum + Number(s.bet_amount || 0), 0),
        totalWinnings: sessions.reduce((sum: number, s: any) => sum + Number(s.win_amount || 0), 0),
      });
    };
    loadHistory();
    Promise.all([
      supabase.from("player_progression").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.rpc("get_active_verification", { p_user_id: user.id }),
    ]).then(([prog, ver]) => {
      setProgression(prog.data);
      setVerification((ver.data as any)?.[0] || null);
    });
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
        <h1 className="text-xl font-bold tracking-tight">Profile</h1>
        <div className="surface-card rounded-lg p-8 flex flex-col items-center justify-center text-center">
          <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-4">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Not Logged In</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">Sign in to access your profile, wallet, and match history.</p>
          <button onClick={() => navigate("/auth")}
            className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity">
            <LogIn className="h-4 w-4" /> Sign In
          </button>
        </div>
      </div>
    );
  }

  const avatarUrl = profile?.avatar_url
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_url).data.publicUrl
    : null;

  const compressImage = (file: File, maxSize: number, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > maxSize || h > maxSize) { const ratio = Math.min(maxSize / w, maxSize / h); w *= ratio; h *= ratio; }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Compression failed")), "image/jpeg", quality);
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    setUploading(true);
    try {
      const compressed = await compressImage(file, 400, 0.8);
      const path = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, compressed, { upsert: true });
      if (uploadError) throw uploadError;
      await supabase.from("profiles").update({ avatar_url: path }).eq("user_id", user.id);
      await refreshProfile();
      toast.success("Avatar updated!");
    } catch (err: any) { toast.error(err.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ display_name: displayName, bio }).eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      setEditing(false);
      toast.success("Profile updated!");
    } catch (err: any) { toast.error(err.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Profile</h1>
        <button onClick={() => { if (editing) handleSaveProfile(); else { setDisplayName(profile?.display_name || ""); setBio(profile?.bio || ""); setEditing(true); } }}
          disabled={saving}
          className="h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-border hover:bg-accent transition-colors disabled:opacity-50">
          {editing ? <><Save className="h-3 w-3" /> Save</> : <><Edit2 className="h-3 w-3" /> Edit</>}
        </button>
      </div>

      {/* Avatar & Info */}
      <div className="surface-card rounded-lg p-6 flex flex-col items-center text-center">
        <div className="relative mb-4">
          {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover" /> :
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-10 w-10 text-primary" /></div>}
          <input type="file" ref={fileRef} accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-50">
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>
        {editing ? (
          <div className="w-full space-y-3">
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display Name"
              className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary" />
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Write a short bio..." maxLength={200}
              className="w-full h-16 rounded-lg bg-background border border-border px-3 py-2 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold flex items-center justify-center gap-1.5">
              {profile?.display_name || profile?.username || "User"}
              <VerifiedBadge tier={verification?.tier} size={16} />
            </h2>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            {profile?.bio && <p className="text-xs text-muted-foreground mt-2 max-w-xs">{profile.bio}</p>}
          </>
        )}
        <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
          <ProgressBadge level={progression?.level} xp={progression?.xp} />
          {progression?.current_streak >= 3 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/15 text-orange-400">
              <Flame className="h-3 w-3" />Streak {progression.current_streak}
            </span>
          )}
          {isAdmin && (
            <span className="px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-1">
              <Shield className="h-3 w-3" /> Admin
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatBox icon={Gamepad2} value={String(stats.games)} label="Games" />
        <StatBox icon={Trophy} value={String(stats.wins)} label="Wins" color="text-success" />
        <StatBox icon={Target} value={`₹${stats.totalBets.toFixed(0)}`} label="Total Bets" color="text-primary" />
        <StatBox icon={TrendingUp} value={`₹${stats.totalWinnings.toFixed(0)}`} label="Winnings" color="text-warning" />
      </div>

      {/* Info cards */}
      <div className="space-y-3">
        <div className="surface-card rounded-lg p-4 flex items-center gap-3">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm">{user.email}</p></div>
        </div>
        <div className="surface-card rounded-lg p-4 flex items-center gap-3">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <div><p className="text-xs text-muted-foreground">Wallet Balance</p><p className="text-sm font-mono-num">₹{Number(profile?.wallet_balance || 0).toFixed(2)}</p></div>
        </div>
        <div className="surface-card rounded-lg p-4 flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div><p className="text-xs text-muted-foreground">Member Since</p><p className="text-sm">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</p></div>
        </div>
      </div>

      {/* Game History */}
      {gameHistory.length > 0 && (
        <div className="surface-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Game History</p>
          </div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {gameHistory.map((g) => (
              <div key={g.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{g.game_title}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(g.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md",
                    g.result === "win" ? "bg-success/10 text-success" : g.result === "loss" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                  )}>{g.result === "win" ? "Win" : g.result === "loss" ? "Loss" : g.result}</span>
                  {Number(g.bet_amount) > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">Bet: ₹{Number(g.bet_amount).toFixed(0)}</p>}
                  {Number(g.win_amount) > 0 && <p className="text-[10px] text-success font-medium">Won: ₹{Number(g.win_amount).toFixed(0)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link to="/settings"
        className="w-full h-10 rounded-lg border border-border text-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-accent transition-colors mb-2">
        <Palette className="h-4 w-4" /> Themes & Settings
      </Link>

      <button onClick={async () => { await signOut(); navigate("/"); }}
        className="w-full h-10 rounded-lg border border-destructive/30 text-destructive text-sm font-medium flex items-center justify-center gap-2 hover:bg-destructive/10 transition-colors">
        <LogOut className="h-4 w-4" /> Sign Out
      </button>
    </div>
  );
};

function StatBox({ icon: Icon, value, label, color }: { icon: any; value: string; label: string; color?: string }) {
  return (
    <div className="surface-card rounded-lg p-3 text-center">
      <Icon className={cn("h-4 w-4 mx-auto mb-1", color || "text-muted-foreground")} />
      <p className={cn("text-sm font-bold font-mono-num", color)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default ProfilePage;
