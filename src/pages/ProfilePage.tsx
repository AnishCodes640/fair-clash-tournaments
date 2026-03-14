import { User, Mail, Calendar, LogIn } from "lucide-react";
import { Link } from "react-router-dom";

const ProfilePage = () => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold tracking-tight">Profile</h1>

      <div className="surface-card rounded-lg p-8 flex flex-col items-center justify-center text-center">
        <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-4">
          <User className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Not Logged In</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Sign in to access your profile, wallet, and match history.
        </p>
        <button className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity">
          <LogIn className="h-4 w-4" />
          Sign In
        </button>
      </div>

      <div className="space-y-3">
        <div className="surface-card rounded-lg p-4 flex items-center gap-3">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm">—</p>
          </div>
        </div>
        <div className="surface-card rounded-lg p-4 flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Member Since</p>
            <p className="text-sm">—</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
