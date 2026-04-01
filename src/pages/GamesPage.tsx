import { Gamepad2, Play, Plane, Dice5 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import aviatorLogo from "@/assets/aviator-logo.jpg";
import ludoClashLogo from "@/assets/ludo-clash-logo.jpg";

const GamesPage = () => {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGames = async () => {
      const { data } = await supabase.from("games").select("*").eq("is_active", true).order("created_at", { ascending: false });
      setGames(data || []);
      setLoading(false);
    };
    fetchGames();
  }, []);

  const gameTypeLabel = (type: string) => {
    const labels: Record<string, string> = { single_player: "Single Player", multiplayer: "Multiplayer", bot_based: "Bot", prediction: "Prediction" };
    return labels[type] || type;
  };

  const totalGames = games.length + 2; // +2 for Aviator & Ludo

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Games</h1>
        <span className="text-xs text-muted-foreground font-mono-num">{totalGames} games</span>
      </div>

      {/* Built-in Aviator */}
      <Link to="/aviator" className="block surface-card rounded-xl overflow-hidden group hover:border-primary/30 transition-all">
        <div className="flex items-center gap-4 p-4">
          <img src={aviatorLogo} alt="Aviator Crash" className="h-14 w-14 rounded-xl object-cover" />
          <div className="flex-1">
            <p className="text-sm font-bold flex items-center gap-1.5"><Plane className="h-4 w-4 text-primary" /> Aviator Crash</p>
            <p className="text-xs text-muted-foreground mt-0.5">Watch the multiplier grow and cash out before crash!</p>
            <div className="flex gap-1 mt-1.5">
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">Live</span>
              <span className="px-1.5 py-0.5 rounded bg-success/10 text-success text-[10px] font-medium">Wallet</span>
            </div>
          </div>
          <Play className="h-5 w-5 text-primary" />
        </div>
      </Link>

      {/* Built-in Ludo Clash */}
      <Link to="/ludo" className="block surface-card rounded-xl overflow-hidden group hover:border-primary/30 transition-all">
        <div className="flex items-center gap-4 p-4">
          <img src={ludoClashLogo} alt="Ludo Clash" className="h-14 w-14 rounded-xl object-cover" />
          <div className="flex-1">
            <p className="text-sm font-bold flex items-center gap-1.5"><Dice5 className="h-4 w-4 text-primary" /> Ludo Clash</p>
            <p className="text-xs text-muted-foreground mt-0.5">Classic board game — 2 or 4 players!</p>
            <div className="flex gap-1 mt-1.5">
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">Multiplayer</span>
              <span className="px-1.5 py-0.5 rounded bg-success/10 text-success text-[10px] font-medium">Real-time</span>
            </div>
          </div>
          <Play className="h-5 w-5 text-primary" />
        </div>
      </Link>

      {/* Browser Games (uploaded) */}
      {loading ? (
        <div className="surface-card rounded-lg p-12 text-center text-sm text-muted-foreground">Loading games...</div>
      ) : games.length === 0 ? (
        <div className="surface-card rounded-lg p-8 text-center text-sm text-muted-foreground">
          More games coming soon! Admin can upload games from the panel.
        </div>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Browser Games</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {games.map((game) => (
              <div key={game.id} className="surface-card rounded-lg overflow-hidden group">
                <div className="aspect-square bg-secondary flex items-center justify-center">
                  {game.icon_url ? (
                    <img src={supabase.storage.from("game-icons").getPublicUrl(game.icon_url).data.publicUrl} alt={game.title} className="w-full h-full object-cover" />
                  ) : (
                    <Gamepad2 className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{game.title}</p>
                  <p className="text-xs text-muted-foreground">{gameTypeLabel(game.game_type)}</p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {game.tournament_enabled && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">Tournament</span>}
                    {game.multiplayer_enabled && <span className="px-1.5 py-0.5 rounded bg-success/10 text-success text-[10px] font-medium">Multiplayer</span>}
                    {game.min_bet && <span className="px-1.5 py-0.5 rounded bg-warning/10 text-warning text-[10px] font-medium">Wallet</span>}
                  </div>
                  {game.game_file_url && (
                    <button onClick={() => navigate(`/play/${game.id}`)}
                      className="w-full mt-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
                      <Play className="h-3 w-3" /> Play
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default GamesPage;
