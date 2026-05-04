import { LayoutGrid, Gamepad2, Wallet, Crown, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutGrid, label: "Home" },
  { to: "/games", icon: Gamepad2, label: "Games" },
  { to: "/social", icon: Users, label: "Social" },
  { to: "/leaderboard", icon: Crown, label: "Ranks" },
  { to: "/wallet", icon: Wallet, label: "Wallet" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border backdrop-blur-sm">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"}
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors duration-200",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}>
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
