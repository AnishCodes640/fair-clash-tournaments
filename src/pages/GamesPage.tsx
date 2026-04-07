import { Gamepad2, Play, Plane, Dice5 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import aviatorLogo from "@/assets/aviator-logo.jpg";
import ludoClashLogo from "@/assets/ludo-clash-logo.jpg";
import ticTacToeLogo from "@/assets/tic-tac-toe-logo.jpg";
import snakeLogo from "@/assets/snake-logo.jpg";
import sudokuLogo from "@/assets/sudoku-logo.png";
import memoryLogo from "@/assets/memory-logo.jpg";
import doodleJumpLogo from "@/assets/doodle-jump-logo.jpg";
import { cn } from "@/lib/utils";

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
    const channel = supabase.channel("games-list-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, () => fetchGames())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const totalGames = games.length + 6; // Aviator + Ludo + TicTacToe + Snake + Memory + Sudoku

  const practiceGames = [
    { to: "/tic-tac-toe", icon: Grid3X3, name: "Tic Tac Toe", desc: "AI opponent · 3 levels" },
    { to: "/snake", icon: Bug, name: "Snake", desc: "Classic arcade · 3 speeds" },
    { to: "/memory", icon: Brain, name: "Memory Match", desc: "Card matching · 3 levels" },
    { to: "/sudoku", icon: Hash, name: "Sudoku", desc: "Number puzzle · 3 levels" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Games</h1>
        <span className="text-xs text-muted-foreground font-mono-num">{totalGames} games</span>
      </div>

      {/* Featured Games - Large Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link to="/aviator" className="group surface-card rounded-2xl overflow-hidden hover:border-primary/30 transition-all hover-scale">
          <div className="relative p-5 flex items-center gap-4">
            <img src={aviatorLogo} alt="Aviator Crash" className="h-16 w-16 rounded-2xl object-cover shadow-md" />
            <div className="flex-1">
              <p className="text-base font-bold flex items-center gap-1.5"><Plane className="h-4 w-4 text-destructive" /> Aviator Crash</p>
              <p className="text-xs text-muted-foreground mt-1">Watch the multiplier grow and cash out before crash!</p>
              <div className="flex gap-1 mt-2">
                <span className="px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-[10px] font-medium">Live</span>
                <span className="px-2 py-0.5 rounded-md bg-success/10 text-success text-[10px] font-medium">₹1–₹30</span>
              </div>
            </div>
            <Play className="h-6 w-6 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>

        <Link to="/ludo" className="group surface-card rounded-2xl overflow-hidden hover:border-primary/30 transition-all hover-scale">
          <div className="relative p-5 flex items-center gap-4">
            <img src={ludoClashLogo} alt="Ludo Clash" className="h-16 w-16 rounded-2xl object-cover shadow-md" />
            <div className="flex-1">
              <p className="text-base font-bold flex items-center gap-1.5"><Dice5 className="h-4 w-4 text-primary" /> Ludo Clash</p>
              <p className="text-xs text-muted-foreground mt-1">Classic board game — 2 or 4 players!</p>
              <div className="flex gap-1 mt-2">
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium">Multiplayer</span>
                <span className="px-2 py-0.5 rounded-md bg-success/10 text-success text-[10px] font-medium">Real-time</span>
              </div>
            </div>
            <Play className="h-6 w-6 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
      </div>

      {/* Practice Games */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Free Practice Games</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {practiceGames.map((g) => (
            <Link key={g.to} to={g.to} className="surface-card rounded-xl overflow-hidden group hover:border-primary/30 transition-all hover-scale">
              <div className="p-4 text-center">
                <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-2">
                  <g.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-bold">{g.name}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{g.desc}</p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-medium">Free</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Browser Games (uploaded) */}
      {loading ? (
        <div className="surface-card rounded-lg p-12 text-center text-sm text-muted-foreground">Loading games...</div>
      ) : games.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Browser Games</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {games.map((game, idx) => {
              const isLarge = idx === 0;
              return (
                <div key={game.id} className={cn(
                  "surface-card rounded-xl overflow-hidden group hover:border-primary/30 transition-all hover-scale",
                  isLarge && "sm:col-span-2 sm:row-span-2"
                )}>
                  <div className={cn("bg-secondary flex items-center justify-center", isLarge ? "aspect-[16/10]" : "aspect-square")}>
                    {game.icon_url ? (
                      <img src={supabase.storage.from("game-icons").getPublicUrl(game.icon_url).data.publicUrl} alt={game.title} className="w-full h-full object-cover" />
                    ) : (
                      <Gamepad2 className={cn("text-muted-foreground", isLarge ? "h-14 w-14" : "h-10 w-10")} />
                    )}
                  </div>
                  <div className="p-3">
                    <p className={cn("font-medium truncate", isLarge ? "text-base" : "text-sm")}>{game.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{game.game_type.replace("_", " ")}</p>
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
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default GamesPage;
