import { Gamepad2, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const GamesPage = () => {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      const { data } = await supabase.from("games").select("*").eq("is_active", true).order("created_at", { ascending: false });
      setGames(data || []);
      setLoading(false);
    };
    fetchGames();
  }, []);

  const gameTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      single_player: "Single Player",
      multiplayer: "Multiplayer",
      bot_based: "Bot",
      prediction: "Prediction",
    };
    return labels[type] || type;
  };

  const openGame = (game: any) => {
    if (game.game_file_url) {
      const url = supabase.storage.from("game-files").getPublicUrl(game.game_file_url).data.publicUrl;
      window.open(url, "_blank");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold tracking-tight">Games</h1>

      {loading ? (
        <div className="surface-card rounded-lg p-12 text-center text-sm text-muted-foreground">Loading games...</div>
      ) : games.length === 0 ? (
        <div className="surface-card rounded-lg p-12 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Gamepad2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">No Games Available</h2>
          <p className="text-sm text-muted-foreground max-w-sm">Games will appear here once the admin adds them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {games.map((game) => (
            <div key={game.id} className="surface-card rounded-lg overflow-hidden group">
              <div className="aspect-square bg-secondary flex items-center justify-center">
                {game.icon_url ? (
                  <img
                    src={supabase.storage.from("game-icons").getPublicUrl(game.icon_url).data.publicUrl}
                    alt={game.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Gamepad2 className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate">{game.title}</p>
                <p className="text-xs text-muted-foreground">{gameTypeLabel(game.game_type)}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {game.tournament_enabled && (
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">Tournament</span>
                  )}
                  {game.multiplayer_enabled && (
                    <span className="px-1.5 py-0.5 rounded bg-success/10 text-success text-[10px] font-medium">Multiplayer</span>
                  )}
                </div>
                {game.game_file_url && (
                  <button
                    onClick={() => openGame(game)}
                    className="w-full mt-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                  >
                    <Play className="h-3 w-3" /> Play
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GamesPage;
