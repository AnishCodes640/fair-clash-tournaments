import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, RotateCcw, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const EMOJIS = ["🎮", "🏆", "⚡", "🎯", "🔥", "💎", "🌟", "🎪", "🚀", "🎲", "🃏", "🎰"];

type Difficulty = "easy" | "normal" | "hard";
const GRID_MAP: Record<Difficulty, number> = { easy: 8, normal: 12, hard: 16 };

const MemoryPage = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [cards, setCards] = useState<{ id: number; emoji: string; flipped: boolean; matched: boolean }[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matched, setMatched] = useState(0);
  const [timer, setTimer] = useState(0);
  const [started, setStarted] = useState(false);
  const [bestTime, setBestTime] = useState(() => Number(localStorage.getItem(`memory_bt_${12}`) || 0));

  const initGame = useCallback((diff: Difficulty) => {
    const count = GRID_MAP[diff];
    const pairs = count / 2;
    const selected = EMOJIS.slice(0, pairs);
    const deck = [...selected, ...selected]
      .sort(() => Math.random() - 0.5)
      .map((emoji, id) => ({ id, emoji, flipped: false, matched: false }));
    setCards(deck); setFlipped([]); setMoves(0); setMatched(0); setTimer(0); setStarted(true);
    setBestTime(Number(localStorage.getItem(`memory_bt_${count}`) || 0));
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
      if (!prev || timer < prev) { localStorage.setItem(key, String(timer)); setBestTime(timer); }
      toast.success(`Completed in ${moves} moves, ${timer}s! 🎉`);
    }
  }, [matched, cards.length, moves, timer]);

  const handleFlip = (id: number) => {
    if (flipped.length === 2) return;
    if (cards[id].matched || cards[id].flipped) return;
    const newCards = [...cards];
    newCards[id].flipped = true;
    setCards(newCards);
    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);
    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newFlipped;
      if (newCards[a].emoji === newCards[b].emoji) {
        newCards[a].matched = true; newCards[b].matched = true;
        setCards([...newCards]); setMatched(m => m + 1); setFlipped([]);
      } else {
        setTimeout(() => {
          newCards[a].flipped = false; newCards[b].flipped = false;
          setCards([...newCards]); setFlipped([]);
        }, 600);
      }
    }
  };

  const cols = difficulty === "easy" ? 4 : difficulty === "normal" ? 4 : 4;
  const done = matched === cards.length / 2 && cards.length > 0;

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/games" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <div><h1 className="text-xl font-bold tracking-tight">🧠 Memory Match</h1><p className="text-[10px] text-muted-foreground">Practice Mode · Free</p></div>
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

      <div className="flex justify-between text-xs">
        <span>Moves: <strong className="font-mono-num">{moves}</strong></span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> <strong className="font-mono-num">{timer}s</strong></span>
        {bestTime > 0 && <span>Best: <strong className="font-mono-num text-warning">{bestTime}s</strong></span>}
      </div>

      <div className={cn("grid gap-2", `grid-cols-${cols}`)} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cards.map((card) => (
          <button key={card.id} onClick={() => handleFlip(card.id)}
            disabled={card.flipped || card.matched}
            className={cn(
              "aspect-square rounded-xl text-2xl flex items-center justify-center transition-all duration-300 border-2",
              card.flipped || card.matched
                ? "bg-primary/10 border-primary/30 scale-100"
                : "bg-card border-border hover:border-primary/30 hover:bg-accent/50 active:scale-95",
              card.matched && "opacity-60"
            )}>
            {(card.flipped || card.matched) ? card.emoji : "?"}
          </button>
        ))}
      </div>

      {done && (
        <button onClick={() => initGame(difficulty)}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <RotateCcw className="h-4 w-4" /> Play Again
        </button>
      )}
    </div>
  );
};

export default MemoryPage;
