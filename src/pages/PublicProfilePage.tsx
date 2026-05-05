import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, UserPlus, UserMinus, MessageCircle, ArrowLeft, Calendar, Trophy, Gamepad2, Target, TrendingUp, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ThemedAvatar } from "@/components/ThemedAvatar";
import { ProgressBadge } from "@/components/ProgressBadge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { UserActionsMenu } from "@/components/UserActionsMenu";

const PublicProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ games: 0, wins: 0, losses: 0, totalBets: 0, totalWinnings: 0 });
  const [progression, setProgression] = useState<any>(null);
  const [verification, setVerification] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const isSelf = user?.id === userId;

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    const [profRes, sessRes, progRes, verRes, followRes, likeRes] = await Promise.all([
      supabase.rpc("get_public_profile", { p_user_id: userId }),
      supabase.from("game_sessions").select("result, bet_amount, win_amount").eq("user_id", userId),
      supabase.from("player_progression").select("*").eq("user_id", userId).maybeSingle(),
      supabase.rpc("get_active_verification", { p_user_id: userId }),
      user ? supabase.from("user_follows").select("id").eq("follower_id", user.id).eq("following_id", userId).maybeSingle() : Promise.resolve({ data: null } as any),
      user ? supabase.from("profile_likes").select("id").eq("liker_id", user.id).eq("liked_id", userId).maybeSingle() : Promise.resolve({ data: null } as any),
    ]);
    const p = (profRes.data as any)?.[0] || null;
    setProfile(p);
    const sessions = sessRes.data || [];
    setStats({
      games: sessions.length,
      wins: sessions.filter((s: any) => s.result === "win" || s.result === "won").length,
      losses: sessions.filter((s: any) => s.result === "loss" || s.result === "lost").length,
      totalBets: sessions.reduce((sum: number, s: any) => sum + Number(s.bet_amount || 0), 0),
      totalWinnings: sessions.reduce((sum: number, s: any) => sum + Number(s.win_amount || 0), 0),
    });
    setProgression(progRes.data);
    setVerification((verRes.data as any)?.[0] || null);
    setIsFollowing(!!followRes.data);
    setIsLiked(!!likeRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId, user?.id]);

  const handleFollow = async () => {
    if (!user) { navigate("/auth"); return; }
    if (isSelf) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("toggle_follow", { p_target: userId });
    setBusy(false);
    const res = data as any;
    if (error || !res?.success) { toast.error(res?.error || error?.message || "Failed"); return; }
    setIsFollowing(!!res.following);
    toast.success(res.following ? "Following" : "Unfollowed");
    load();
  };

  const handleLike = async () => {
    if (!user) { navigate("/auth"); return; }
    if (isSelf) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("toggle_profile_like", { p_target: userId });
    setBusy(false);
    const res = data as any;
    if (error || !res?.success) { toast.error(res?.error || error?.message || "Failed"); return; }
    setIsLiked(!!res.liked);
    load();
  };

  const handleChat = () => {
    if (!user) { navigate("/auth"); return; }
    navigate(`/chat/${userId}`);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="surface-card rounded-xl p-12 text-center text-sm text-muted-foreground">Loading profile…</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        <button onClick={() => navigate(-1)} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
        <div className="surface-card rounded-xl p-12 text-center text-sm text-muted-foreground">Profile not found.</div>
      </div>
    );
  }

  const avatarUrl = profile.avatar_url
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_url).data.publicUrl
    : null;
  const winRate = stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
        {!isSelf && userId && <UserActionsMenu targetUserId={userId} targetName={profile.username} contextUrl={`/u/${userId}`} />}
      </div>

      <div className={cn("surface-card rounded-2xl p-6 flex flex-col items-center text-center",
        profile.is_admin && "border-red-500/30")}>
        <ThemedAvatar src={avatarUrl} name={profile.display_name || profile.username} themeId={profile.active_theme} size={88} />
        <h1 className="text-xl font-bold mt-3 flex items-center gap-1.5">
          {profile.display_name || profile.username}
          <VerifiedBadge tier={verification?.tier} size={18} />
        </h1>
        <p className="text-xs text-muted-foreground">@{profile.username}</p>
        {profile.bio && <p className="text-xs text-muted-foreground mt-2 max-w-sm">{profile.bio}</p>}

        <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
          <ProgressBadge level={progression?.level} xp={progression?.xp} />
          {profile.is_admin && (
            <span className="px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-[10px] font-bold flex items-center gap-1">
              <Shield className="h-3 w-3" /> ADMIN
            </span>
          )}
          {profile.created_at && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {new Date(profile.created_at).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 w-full max-w-xs">
          <div>
            <p className="text-base font-bold font-mono-num">{Number(profile.follower_count || 0)}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Followers</p>
          </div>
          <div>
            <p className="text-base font-bold font-mono-num">{Number(profile.following_count || 0)}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Following</p>
          </div>
          <div>
            <p className="text-base font-bold font-mono-num">{Number(profile.like_count || 0)}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Likes</p>
          </div>
        </div>

        {!isSelf && (
          <div className="grid grid-cols-3 gap-2 mt-5 w-full">
            <button onClick={handleFollow} disabled={busy}
              className={cn("h-10 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors",
                isFollowing ? "bg-secondary text-foreground hover:bg-accent" : "bg-primary text-primary-foreground hover:opacity-90")}>
              {isFollowing ? <><UserMinus className="h-3.5 w-3.5" /> Unfollow</> : <><UserPlus className="h-3.5 w-3.5" /> Follow</>}
            </button>
            <button onClick={handleLike} disabled={busy}
              className={cn("h-10 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors",
                isLiked ? "border-pink-500/40 bg-pink-500/10 text-pink-500" : "border-border hover:bg-accent")}>
              <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-current")} /> {isLiked ? "Liked" : "Like"}
            </button>
            <button onClick={handleChat}
              className="h-10 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-border hover:bg-accent transition-colors">
              <MessageCircle className="h-3.5 w-3.5" /> Chat
            </button>
          </div>
        )}
        {isSelf && (
          <Link to="/profile" className="mt-5 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity">
            View your full profile
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <StatBox icon={Gamepad2} value={String(stats.games)} label="Games" />
        <StatBox icon={Trophy} value={String(stats.wins)} label="Wins" color="text-success" />
        <StatBox icon={Target} value={String(stats.losses)} label="Losses" color="text-destructive" />
        <StatBox icon={TrendingUp} value={`${winRate}%`} label="Win Rate" color="text-primary" />
        <StatBox icon={Users} value={String(progression?.best_streak || 0)} label="Best Streak" color="text-warning" />
      </div>
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

export default PublicProfilePage;
