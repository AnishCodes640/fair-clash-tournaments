import { User, Mail, Calendar, LogIn, LogOut, Shield, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const ProfilePage = () => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

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
          <button
            onClick={() => navigate("/auth")}
            className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <LogIn className="h-4 w-4" /> Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold tracking-tight">Profile</h1>

      <div className="surface-card rounded-lg p-6 flex flex-col items-center text-center">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <User className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">{profile?.username || "User"}</h2>
        <p className="text-xs text-muted-foreground">{user.email}</p>
        {isAdmin && (
          <span className="mt-2 px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-1">
            <Shield className="h-3 w-3" /> Admin
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="surface-card rounded-lg p-4 flex items-center gap-3">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm">{user.email}</p>
          </div>
        </div>
        <div className="surface-card rounded-lg p-4 flex items-center gap-3">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Wallet Balance</p>
            <p className="text-sm font-mono-num">₹{Number(profile?.wallet_balance || 0).toFixed(2)}</p>
          </div>
        </div>
        <div className="surface-card rounded-lg p-4 flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Member Since</p>
            <p className="text-sm">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</p>
          </div>
        </div>
      </div>

      <button
        onClick={async () => {
          await signOut();
          navigate("/");
        }}
        className="w-full h-10 rounded-lg border border-destructive/30 text-destructive text-sm font-medium flex items-center justify-center gap-2 hover:bg-destructive/10 transition-colors"
      >
        <LogOut className="h-4 w-4" /> Sign Out
      </button>
    </div>
  );
};

export default ProfilePage;
