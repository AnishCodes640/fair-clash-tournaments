import { User, Shield, Moon, Sun, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import fairclashLogo from "@/assets/fairclash-logo.jpg";

export function AppHeader() {
  const { user, isAdmin, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const avatarUrl = profile?.avatar_url
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_url).data.publicUrl
    : null;

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <img src={fairclashLogo} alt="FairClash" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-primary to-[hsl(220,80%,55%)] bg-clip-text text-transparent">FairClash</span>
        </Link>
        <div className="flex items-center gap-1">
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
            <Link
              to="/profile"
              className="h-9 w-9 rounded-lg flex items-center justify-center overflow-hidden"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
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
