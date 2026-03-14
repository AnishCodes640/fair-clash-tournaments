import {
  Users, Gamepad2, Trophy, Wallet, AlertTriangle,
  TrendingUp, Ban, CreditCard, Settings, Bell,
  Shield, Database, Palette, FileText
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Link } from "react-router-dom";

const adminSections = [
  { icon: Users, label: "User Management", desc: "View, search, ban/unban users", to: "/admin/users" },
  { icon: CreditCard, label: "Payment Verification", desc: "Review deposit requests", to: "/admin/payments" },
  { icon: Gamepad2, label: "Game Management", desc: "Add, edit, remove games", to: "/admin/games" },
  { icon: Trophy, label: "Tournament Management", desc: "Create and manage tournaments", to: "/admin/tournaments" },
  { icon: Bell, label: "Global Notices", desc: "Post platform-wide notices", to: "/admin/notices" },
  { icon: Palette, label: "App Customization", desc: "Colors, logo, banners", to: "/admin/customize" },
  { icon: Shield, label: "Security & Anti-Cheat", desc: "Review flagged accounts", to: "/admin/security" },
  { icon: Settings, label: "AI Configuration", desc: "Customize AI assistant", to: "/admin/ai-config" },
];

const AdminPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Command Center</h1>
          <p className="text-xs text-muted-foreground mt-1">Admin Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 px-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            Admin Only
          </div>
        </div>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total Users" value="0" />
        <StatCard icon={Gamepad2} label="Total Games" value="0" />
        <StatCard icon={Trophy} label="Tournaments" value="0" />
        <StatCard icon={TrendingUp} label="Platform Earnings" value="₹0.00" />
        <StatCard icon={Users} label="Active Users" value="0" />
        <StatCard icon={Ban} label="Banned Users" value="0" />
        <StatCard icon={CreditCard} label="Pending Deposits" value="0" />
        <StatCard icon={Wallet} label="Total Wallet Balance" value="₹0.00" />
      </section>

      {/* Admin Sections */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Management</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {adminSections.map((section) => (
            <Link
              key={section.label}
              to={section.to}
              className="surface-card rounded-lg p-4 group hover:border-primary/30 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <section.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium mb-1">{section.label}</p>
              <p className="text-xs text-muted-foreground">{section.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Kill Switch */}
      <section className="surface-card rounded-lg p-4 border-l-2 border-l-destructive">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Emergency Controls</p>
            <p className="text-xs text-muted-foreground">Disable withdrawals or games during maintenance</p>
          </div>
          <button className="h-9 px-4 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 transition-opacity">
            Kill Switch
          </button>
        </div>
      </section>
    </div>
  );
};

export default AdminPage;
