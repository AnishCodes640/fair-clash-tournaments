import { Trophy, Gamepad2, Users, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { StatCard } from "@/components/StatCard";

const HomePage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 animate-fade-in">
      {/* Hero */}
      <section className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Compete. Win. Withdraw.</h1>
        <p className="text-sm text-muted-foreground">
          The professional standard for mobile esports.
        </p>
      </section>

      {/* Quick Stats */}
      <section className="grid grid-cols-2 gap-3">
        <StatCard icon={Trophy} label="Active Tournaments" value="0" />
        <StatCard icon={Gamepad2} label="Games Available" value="0" />
        <StatCard icon={Users} label="Players Online" value="0" />
        <StatCard icon={TrendingUp} label="Prize Pool" value="₹0.00" />
      </section>

      {/* Quick Actions */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link to="/games" className="surface-card rounded-lg p-4 flex items-center justify-between group hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Gamepad2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Browse Games</p>
                <p className="text-xs text-muted-foreground">Find your next match</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
          <Link to="/tournaments" className="surface-card rounded-lg p-4 flex items-center justify-between group hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Tournaments</p>
                <p className="text-xs text-muted-foreground">Compete for prizes</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        </div>
      </section>

      {/* Global Notice Placeholder */}
      <section className="surface-card rounded-lg p-4 border-l-2 border-l-primary">
        <p className="text-xs text-muted-foreground">No active notices</p>
      </section>
    </div>
  );
};

export default HomePage;
