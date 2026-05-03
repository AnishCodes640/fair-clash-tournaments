import { User, Shield, Moon, Sun, LogIn, ShoppingCart, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import fairclashLogo from "@/assets/fairclash-logo.jpg";
import { ThemedAvatar } from "./ThemedAvatar";

export function AppHeader() {
  const { user, isAdmin, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [unread, setUnread] = useState(0);

  const avatarUrl = profile?.avatar_url
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_url).data.publicUrl
    : null;

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    const load = async () => {
      const [mRes, rRes] = await Promise.all([
        supabase.from("mailbox_messages").select("id"),
        supabase.from("mailbox_reads").select("message_id").eq("user_id", user.id),
      ]);
      const readSet = new Set((rRes.data || []).map((r: any) => r.message_id));
      setUnread((mRes.data || []).filter((m: any) => !readSet.has(m.id)).length);
    };
    load();
    const ch = supabase.channel("mailbox-bell")
      .on("postgres_changes", { event: "*", schema: "public", table: "mailbox_messages" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "mailbox_reads" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <img src={fairclashLogo} alt="FairClash" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-primary to-[hsl(220,80%,55%)] bg-clip-text text-transparent">FairClash</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link to="/store" className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" aria-label="Store">
            <ShoppingCart className="h-4 w-4" />
          </Link>
          {user && (
            <Link to="/mailbox" className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors relative" aria-label="Mailbox">
              <Inbox className="h-4 w-4" />
              {unread > 0 && <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">{unread}</span>}
            </Link>
          )}
          <button
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {isAdmin && (
            <Link
              to="/admin"
              className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Shield className="h-4 w-4" />
            </Link>
          )}
          {user ? (
            <Link to="/profile" className="ml-1">
              <ThemedAvatar src={avatarUrl} name={profile?.display_name || profile?.username} themeId={profile?.active_theme} size={32} />
            </Link>
          ) : (
            <Link
              to="/auth"
              className="h-9 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

