import { Trophy, Clock, Radio, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Tab = "upcoming" | "live" | "completed";

const tabs: { id: Tab; label: string; icon: typeof Clock }[] = [
  { id: "upcoming", label: "Upcoming", icon: Clock },
  { id: "live", label: "Live", icon: Radio },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
];

const TournamentsPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold tracking-tight">Tournaments</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-colors duration-200",
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty State */}
      <div className="surface-card rounded-lg p-12 flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No {tabs.find(t => t.id === activeTab)?.label} Tournaments</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Tournaments will appear here once created by the admin.
        </p>
      </div>
    </div>
  );
};

export default TournamentsPage;
