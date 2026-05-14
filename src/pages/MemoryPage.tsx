import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, RotateCcw, Clock, Users, Cpu } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { playSound } from "@/lib/soundManager";
import memoryLogo from "@/assets/memory-logo.jpg";
import { SEO } from "@/components/SEO";

type Difficulty = "easy" | "normal" | "hard";
type GameMode = "solo" | "local";
const GRID_MAP: Record<Difficulty, number> = { easy: 8, normal: 12, hard: 16 };

const CARD_ICONS: { shape: string; color: string; bg: string }[] = [
  { shape: "star", color: "#f59e0b", bg: "#fef3c7" },
  { shape: "heart", color: "#ef4444", bg: "#fee2e2" },
  { shape: "diamond", color: "#3b82f6", bg: "#dbeafe" },
  { shape: "circle", color: "#22c55e", bg: "#dcfce7" },
  { shape: "triangle", color: "#a855f7", bg: "#f3e8ff" },
  { shape: "hex", color: "#ec4899", bg: "#fce7f3" },
  { shape: "cross", color: "#f97316", bg: "#ffedd5" },
  { shape: "moon", color: "#6366f1", bg: "#e0e7ff" },
  { shape: "bolt", color: "#eab308", bg: "#fef9c3" },
  { shape: "crown", color: "#d97706", bg: "#fef3c7" },
  { shape: "drop", color: "#0ea5e9", bg: "#e0f2fe" },
  { shape: "flame", color: "#dc2626", bg: "#fecaca" },
];

function CardIcon({ shape, color, size = 32 }: { shape: string; color: string; size?: number }) {
  const s = size;
  switch (shape) {
    case "star": return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
    case "heart": return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
    case "diamond": return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M12 2L2 12l10 10 10-10L12 2z"/></svg>;
    case "circle": return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><circle cx="12" cy="12" r="10"/></svg>;
    case "triangle": return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M12 2L2 22h20L12 2z"/></svg>;
    case "hex": return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M12 2l9 5v10l-9 5-9-5V7l9-5z"/></svg>;
    case "cross": return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z"/></svg>;
    case "moon": return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
    case "bolt": return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
    case "crown": return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M2 20h20l-2-8-4 4-4-8-4 8-4-4-2 8zm2-10l2 2 4-6 4 6 2-2 2 4V6H4v4z"/></svg>;
    case "drop": return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M12 2C8 8 4 12.5 4 16a8 8 0 1 0 16 0c0-3.5-4-8-8-14z"/></svg>;
    case "flame": return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M12 23c-4.97 0-9-3.58-9-8 0-3.19 2.13-6.12 4-8 .74-.74 2-.18 2 .88v.38c0 1.42.82 2.72 2.12 3.32.37.17.8-.04.8-.45 0-2.1.86-4.1 2.38-5.56C15.54 4.37 17 2 17 2s4 4.58 4 13c0 4.42-4.03 8-9 8z"/></svg>;
    default: return <div className="w-8 h-8 rounded-full" style={{ background: color }} />;
  }
}

const MemoryPage = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [gameMode, setGameMode] = useState<GameMode>("solo");
  const [cards, setCards] = useState<{ id: number; iconIdx: number; flipped: boolean; matched: boolean }[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matched, setMatched] = useState(0);
  const [timer, setTimer] = useState(0);
  const [started, setStarted] = useState(false);
  const [bestTime, setBestTime] = useState(() => Number(localStorage.getItem(`memory_bt_12`) || 0));
  // Local multiplayer state
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [playerScores, setPlayerScores] = useState({ p1: 0, p2: 0 });

  const initGame = useCallback((diff: Difficulty) => {
    const count = GRID_MAP[diff];
    const pairs = count / 2;
    const selected = Array.from({ length: pairs }, (_, i) => i);
    const deck = [...selected, ...selected]
      .sort(() => Math.random() - 0.5)
      .map((iconIdx, id) => ({ id, iconIdx, flipped: false, matched: false }));
    setCards(deck); setFlipped([]); setMoves(0); setMatched(0); setTimer(0); setStarted(true);
    setBestTime(Number(localStorage.getItem(`memory_bt_${count}`) || 0));
    setCurrentPlayer(1);
    setPlayerScores({ p1: 0, p2: 0 });
  }, []);

  useEffect(() => { initGame(difficulty); }, [difficulty, initGame]);

  useEffect(() => {
    if (!started || matched === cards.length / 2) return;
    const t = setInterval(() => setTimer(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [started, matched, cards.length]);

  useEffect(() => {
    if (matched > 0 && matched === cards.length / 2) {
      const key = `memory_bt_${cards.length}`;
      const prev = Number(localStorage.getItem(key) || 0);
      if (gameMode === "solo" && (!prev || timer < prev)) { localStorage.setItem(key, String(timer)); setBestTime(timer); }
      if (gameMode === "local") {
        const winner = playerScores.p1 > playerScores.p2 ? "Player 1" : playerScores.p2 > playerScores.p1 ? "Player 2" : "Tie";
        toast.success(winner === "Tie" ? "It's a tie!" : `${winner} wins!`);
      } else {
        toast.success(`Completed in ${moves} moves, ${timer}s! 🎉`);
      }
      playSound("win");
    }
  }, [matched, cards.length, moves, timer, gameMode, playerScores]);

  const handleFlip = (id: number) => {
    if (flipped.length === 2) return;
    if (cards[id].matched || cards[id].flipped) return;
    playSound("flip");
    const newCards = [...cards];
    newCards[id] = { ...newCards[id], flipped: true };
    setCards(newCards);
    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);
    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newFlipped;
      if (newCards[a].iconIdx === newCards[b].iconIdx) {
        const updatedCards = [...newCards];
        updatedCards[a] = { ...updatedCards[a], matched: true };
        updatedCards[b] = { ...updatedCards[b], matched: true };
        setCards(updatedCards);
        setMatched(m => m + 1);
        setFlipped([]);
        if (gameMode === "local") {
          setPlayerScores(s => currentPlayer === 1 ? { ...s, p1: s.p1 + 1 } : { ...s, p2: s.p2 + 1 });
        }
      } else {
        setTimeout(() => {
          const reset = [...newCards];
          reset[a] = { ...reset[a], flipped: false };
          reset[b] = { ...reset[b], flipped: false };
          setCards(reset);
          setFlipped([]);
          if (gameMode === "local") {
            setCurrentPlayer(p => p === 1 ? 2 : 1);
          }
        }, 600);
      }
    }
  };

  const cols = 4;
  const done = matched === cards.length / 2 && cards.length > 0;

  return (
    <>
      <SEO title="Memory Match — Card Matching Game — FairClash" description="Play Memory Match card game on FairClash. Solo or 2-player local mode with three difficulty levels." path="/memory" jsonLd={{"@context":"https://schema.org","@type":"Game","name":"Memory Match","url":"https://fair-clash-beta.lovable.app/memory","provider":{"@type":"Organization","name":"Fair Fun Studios"},"genre":"Online Game"}} />
      <div className="max-w-md mx-auto px-4 py-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/games" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <img src={memoryLogo} alt="Memory Match" className="h-10 w-10 rounded-xl object-cover" />
        <div><h1 className="text-xl font-bold tracking-tight">Memory Match</h1><p className="text-[10px] text-muted-foreground">Practice Mode · Free</p></div>
      </div>

      {/* Game Mode */}
      <div className="flex gap-2">
        <button onClick={() => { setGameMode("solo"); initGame(difficulty); }}
          className={cn("flex-1 h-8 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all",
            gameMode === "solo" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
          <Cpu className="h-3.5 w-3.5" /> Solo
        </button>
        <button onClick={() => { setGameMode("local"); initGame(difficulty); }}
          className={cn("flex-1 h-8 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all",
            gameMode === "local" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
          <Users className="h-3.5 w-3.5" /> 2 Players
        </button>
      </div>

      <div className="flex gap-2">
        {(["easy", "normal", "hard"] as Difficulty[]).map(d => (
          <button key={d} onClick={() => setDifficulty(d)}
            className={cn("flex-1 h-8 rounded-lg text-xs font-medium capitalize transition-all",
              difficulty === d ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
            {d} ({GRID_MAP[d] / 2} pairs)
          </button>
        ))}
      </div>

      {/* Turn indicator (local) */}
      {gameMode === "local" && !done && (
        <div className={cn("text-center py-2 rounded-lg text-sm font-semibold transition-all",
          currentPlayer === 1 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
          Player {currentPlayer}'s Turn — P1: {playerScores.p1} · P2: {playerScores.p2}
        </div>
      )}

      <div className="flex justify-between text-xs">
        <span>Moves: <strong className="font-mono-num">{moves}</strong></span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> <strong className="font-mono-num">{timer}s</strong></span>
        {gameMode === "solo" && bestTime > 0 && <span>Best: <strong className="font-mono-num text-warning">{bestTime}s</strong></span>}
      </div>

      <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cards.map((card) => {
          const isRevealed = card.flipped || card.matched;
          const iconData = CARD_ICONS[card.iconIdx];
          return (
            <button
              key={card.id}
              onClick={() => handleFlip(card.id)}
              disabled={isRevealed}
              className="aspect-square [perspective:600px]"
            >
              <div className={cn(
                "relative w-full h-full transition-transform duration-400 [transform-style:preserve-3d]",
                isRevealed && "[transform:rotateY(180deg)]"
              )}>
                {/* Card Back */}
                <div className={cn(
                  "absolute inset-0 rounded-2xl [backface-visibility:hidden] flex items-center justify-center",
                  "bg-gradient-to-br from-primary/30 via-accent/40 to-primary/20 border-2 border-primary/20",
                  "hover:border-primary/40 hover:shadow-lg active:scale-95 transition-all"
                )}>
                  <div className="bg-card rounded-xl m-1.5 w-[calc(100%-12px)] h-[calc(100%-12px)] flex items-center justify-center">
                    <span className="text-primary/40 text-lg font-bold">?</span>
                  </div>
                </div>
                {/* Card Front */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-2xl [backface-visibility:hidden] [transform:rotateY(180deg)] p-2 transition-opacity",
                    card.matched && "opacity-60"
                  )}
                  style={{ backgroundColor: iconData.bg }}
                >
                  <div className="w-full h-full rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <CardIcon {...iconData} size={difficulty === "hard" ? 22 : 30} />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {done && (
        <button onClick={() => initGame(difficulty)}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <RotateCcw className="h-4 w-4" /> Play Again
        </button>
      )}
    </div>
    </>
  );
};

export default MemoryPage;
