import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, MessageCircle, Search, Rss, Trophy, Gamepad2 } from "lucide-react";
import { ThemedAvatar } from "@/components/ThemedAvatar";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/SEO";

interface Conv {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  active_theme: string | null;
  last_message: string;
  last_at: string;
  unread: number;
}

const SocialPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"feed" | "chats" | "following" | "followers">("feed");
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);

  const loadFeed = async () => {
    const { data } = await supabase.rpc("get_friend_feed", { p_limit: 30 });
    setFeed(data || []);
  };

  const loadConversations = async () => {
    if (!user) return;
    const { data: msgs } = await supabase
      .from("direct_messages")
      .select("id, sender_id, recipient_id, body, is_read, created_at, deleted_for_sender, deleted_for_recipient")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(500);

    const otherIds = new Set<string>();
    const grouped = new Map<string, any>();
    (msgs || []).forEach((m: any) => {
      const isMine = m.sender_id === user.id;
      if (isMine && m.deleted_for_sender) return;
      if (!isMine && m.deleted_for_recipient) return;
      const other = isMine ? m.recipient_id : m.sender_id;
      otherIds.add(other);
      const prev = grouped.get(other);
      const unreadInc = !isMine && !m.is_read ? 1 : 0;
      if (!prev) {
        grouped.set(other, { last_message: m.body, last_at: m.created_at, unread: unreadInc });
      } else {
        prev.unread += unreadInc;
      }
    });

    if (otherIds.size === 0) { setConversations([]); return; }
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url, active_theme")
      .in("user_id", Array.from(otherIds));

    const list: Conv[] = (profs || []).map((p: any) => {
      const g = grouped.get(p.user_id);
      return {
        user_id: p.user_id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        active_theme: p.active_theme,
        last_message: g.last_message,
        last_at: g.last_at,
        unread: g.unread,
      };
    }).sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime());

    setConversations(list);
  };

  const loadFollows = async () => {
    if (!user) return;
    const [foll, fers] = await Promise.all([
      supabase.from("user_follows").select("following_id").eq("follower_id", user.id),
      supabase.from("user_follows").select("follower_id").eq("following_id", user.id),
    ]);
    const followIds = (foll.data || []).map((r: any) => r.following_id);
    const followerIds = (fers.data || []).map((r: any) => r.follower_id);
    const allIds = Array.from(new Set([...followIds, ...followerIds]));
    if (allIds.length === 0) { setFollowing([]); setFollowers([]); return; }
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url, active_theme")
      .in("user_id", allIds);
    const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
    setFollowing(followIds.map((id) => profMap.get(id)).filter(Boolean));
    setFollowers(followerIds.map((id) => profMap.get(id)).filter(Boolean));
  };

  useEffect(() => {
    if (!user) return;
    loadConversations();
    loadFollows();
    loadFeed();
    const ch = supabase.channel("social-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, loadConversations)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_follows" }, () => { loadFollows(); loadFeed(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "game_sessions" }, loadFeed)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (!user) {
    return (
      <>
        <SEO title="Social Feed — FairClash Friends & Activity" description="Follow other players, view your friend activity feed and stay up-to-date with wins and tier advancements on FairClash." path="/social" />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-4">
        <h1 className="text-xl font-bold">Social</h1>
        <p className="text-sm text-muted-foreground">Sign in to chat with friends and follow players.</p>
        <button onClick={() => navigate("/auth")} className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Sign in</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Social</h1>
        </div>
        <Link to="/search" className="h-9 px-3 rounded-lg bg-secondary hover:bg-accent transition-colors text-xs font-medium flex items-center gap-1.5">
          <Search className="h-3.5 w-3.5" /> Search
        </Link>
      </div>

      <div className="flex gap-1 bg-secondary rounded-lg p-1">
        {(["feed","chats","following","followers"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("flex-1 py-2 rounded-md text-xs font-medium capitalize transition-colors",
              tab === t ? "bg-card shadow-sm" : "text-muted-foreground")}>
            {t}
            {t === "chats" && conversations.some((c) => c.unread > 0) && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                {conversations.reduce((s, c) => s + c.unread, 0)}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "feed" && (
        feed.length === 0 ? (
          <div className="surface-card rounded-xl p-12 text-center text-xs text-muted-foreground">
            <Rss className="h-5 w-5 mx-auto mb-2 opacity-50" />
            Follow players to see their activity here.
          </div>
        ) : (
          <div className="space-y-2">
            {feed.map((f: any, i: number) => {
              const avatarUrl = f.avatar_url ? supabase.storage.from("avatars").getPublicUrl(f.avatar_url).data.publicUrl : null;
              const Icon = f.kind === "level" ? Trophy : Gamepad2;
              return (
                <div key={i} className="surface-card rounded-xl p-3 flex items-center gap-3">
                  <Link to={`/u/${f.user_id}`}>
                    <ThemedAvatar src={avatarUrl} name={f.display_name || f.username} themeId={f.active_theme} variant="box" size={40} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/u/${f.user_id}`} className="text-sm font-bold truncate hover:underline">
                      {f.display_name || f.username}
                    </Link>
                    <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                      <Icon className="h-3 w-3" /> {f.summary}
                    </p>
                    <p className="text-[9px] text-muted-foreground">{new Date(f.occurred_at).toLocaleString()}</p>
                  </div>
                  <Link to={`/chat/${f.user_id}`} className="h-8 w-8 rounded-full bg-secondary hover:bg-accent flex items-center justify-center">
                    <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === "chats" && (
        conversations.length === 0 ? (
          <div className="surface-card rounded-xl p-12 text-center text-xs text-muted-foreground">
            No conversations yet. Open someone's profile to start chatting.
          </div>
        ) : (
          <div className="surface-card rounded-xl overflow-hidden divide-y divide-border">
            {conversations.map((c) => {
              const avatarUrl = c.avatar_url ? supabase.storage.from("avatars").getPublicUrl(c.avatar_url).data.publicUrl : null;
              return (
                <Link key={c.user_id} to={`/chat/${c.user_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">
                  <ThemedAvatar src={avatarUrl} name={c.display_name || c.username} themeId={c.active_theme} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate">{c.display_name || c.username}</p>
                      <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(c.last_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className={cn("text-xs truncate", c.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                      {c.last_message}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {c.unread}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )
      )}

      {tab === "following" && <UserList users={following} emptyText="You're not following anyone yet." />}
      {tab === "followers" && <UserList users={followers} emptyText="No followers yet." />}
    </div>
  );
};

function UserList({ users, emptyText }: { users: any[]; emptyText: string }) {
  if (users.length === 0) {
    return <div className="surface-card rounded-xl p-12 text-center text-xs text-muted-foreground">{emptyText}</div>;
  }
  return (
    <div className="surface-card rounded-xl overflow-hidden divide-y divide-border">
      {users.map((u) => {
        const avatarUrl = u.avatar_url ? supabase.storage.from("avatars").getPublicUrl(u.avatar_url).data.publicUrl : null;
        return (
          <Link key={u.user_id} to={`/u/${u.user_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">
            <ThemedAvatar src={avatarUrl} name={u.display_name || u.username} themeId={u.active_theme} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{u.display_name || u.username}</p>
              <p className="text-[11px] text-muted-foreground truncate">@{u.username}</p>
            </div>
            <Link to={`/chat/${u.user_id}`} onClick={(e) => e.stopPropagation()}
              className="h-8 w-8 rounded-full bg-secondary hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="h-3.5 w-3.5" />
            </Link>
          </Link>
        );
      })}
    </div>
    </>
  );
}

export default SocialPage;
