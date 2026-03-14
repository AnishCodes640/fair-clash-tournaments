import { Gamepad2 } from "lucide-react";

const GamesPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Games</h1>
      </div>

      {/* Empty State */}
      <div className="surface-card rounded-lg p-12 flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Gamepad2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No Games Available</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Games will appear here once the admin adds them through the admin panel.
        </p>
      </div>
    </div>
  );
};

export default GamesPage;
