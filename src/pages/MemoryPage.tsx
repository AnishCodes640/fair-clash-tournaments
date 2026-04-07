import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, RotateCcw, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import memoryLogo from "@/assets/memory-logo.jpg";

type Difficulty = "easy" | "normal" | "hard";
const GRID_MAP: Record<Difficulty, number> = { easy: 8, normal: 12, hard: 16 };

// Colorful SVG icon shapes instead of emojis
const CARD_ICONS: { shape: string; color: string }[] = [
  { shape: "star", color: "#f59e0b" },
  { shape: "heart", color: "#ef4444" },
  { shape: "diamond", color: "#3b82f6" },
  { shape: "circle", color: "#22c55e" },
  { shape: "triangle", color: "#a855f7" },
  { shape: "hex", color: "#ec4899" },
  { shape: "cross", color: "#f97316" },
  { shape: "moon", color: "#6366f1" },
  { shape: "bolt", color: "#eab308" },
  { shape: "crown", color: "#d97706" },
  { shape: "drop", color: "#0ea5e9" },
  { shape: "flame", color: "#dc2626" },
];

function CardIcon({ shape, color, size = 32 }: { shape: string; color: string; size?: number }) {
  const s = size;
  const h = s / 2;
  switch (shape) {
    case "star":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
    case "heart":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
    case "diamond":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M12 2L2 12l10 10 10-10L12 2z"/></svg>;
    case "circle":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><circle cx="12" cy="12" r="10"/></svg>;
    case "triangle":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M12 2L2 22h20L12 2z"/></svg>;
    case "hex":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M12 2l9 5v10l-9 5-9-5V7l9-5z"/></svg>;
    case "cross":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z"/></svg>;
    case "moon":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
    case "bolt":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
    case "crown":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M2 20h20l-2-8-4 4-4-8-4 8-4-4-2 8zm2-10l2 2 4-6 4 6 2-2 2 4V6H4v4z"/></svg>;
    case "drop":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M12 2C8 8 4 12.5 4 16a8 8 0 1 0 16 0c0-3.5-4-8-8-14z"/></svg>;
    case "flame":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M12 23c-4.97 0-9-3.58-9-8 0-3.19 2.13-6.12 4-8 .74-.74 2-.18 2 .88v.38c0 1.42.82 2.72 2.12 3.32.37.17.8-.04.8-.45 0-2.1.86-4.1 2.38-5.56C15.54 4.37 17 2 17 2s4 4.58 4 13c0 4.42-4.03 8-9 8z"/></svg>;
    default:
      return <div className="w-8 h-8 rounded-full" style={{ background: color }} />;
  }
}

const MemoryPage = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [cards, setCards] = useState<{ id: number; iconIdx: number; flipped: boolean; matched: boolean }[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matched, setMatched] = useState(0);
  const [timer, setTimer] = useState(0);
  const [started, setStarted] = useState(false);
  const [bestTime, setBestTime] = useState(() => Number(localStorage.getItem(`memory_bt_12`) || 0));

  const initGame = useCallback((diff: Difficulty) => {
    const count = GRID_MAP[diff];
    const pairs = count / 2;
    const selected = Array.from({ length: pairs }, (_, i) => i);
    const deck = [...selected, ...selected]
      .sort(() => Math.random() - 0.5)
      .map((iconIdx, id) => ({ id, iconIdx, flipped: false, matched: false }));
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
    newCards[id] = { ...newCards[id], flipped: true };
    setCards(newCards);
    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);
    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newFlipped;
      if (newCards[a].iconIdx === newCards[b].iconIdx) {
        const matched1 = { ...newCards[a], matched: true };
        const matched2 = { ...newCards[b], matched: true };
        const updatedCards = [...newCards];
        updatedCards[a] = matched1;
        updatedCards[b] = matched2;
        setCards(updatedCards);
        setMatched(m => m + 1);
        setFlipped([]);
      } else {
        setTimeout(() => {
          const reset = [...newCards];
          reset[a] = { ...reset[a], flipped: false };
          reset[b] = { ...reset[b], flipped: false };
          setCards(reset);
          setFlipped([]);
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
        <img src={memoryLogo} alt="Memory Match" className="h-10 w-10 rounded-xl object-cover" />
        <div><h1 className="text-xl font-bold tracking-tight">Memory Match</h1><p className="text-[10px] text-muted-foreground">Practice Mode · Free</p></div>
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

      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cards.map((card) => {
          const isRevealed = card.flipped || card.matched;
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
                  "absolute inset-0 rounded-xl [backface-visibility:hidden] flex items-center justify-center border-2",
                  "bg-gradient-to-br from-primary/20 via-accent/30 to-primary/10 border-primary/20",
                  "hover:border-primary/40 hover:shadow-md active:scale-95 transition-all"
                )}>
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">?</div>
                </div>
                {/* Card Front */}
                <div className={cn(
                  "absolute inset-0 rounded-xl [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center border-2",
                  card.matched ? "bg-success/10 border-success/30 opacity-60" : "bg-card border-primary/30"
                )}>
                  <CardIcon {...CARD_ICONS[card.iconIdx]} size={difficulty === "hard" ? 24 : 32} />
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
  );
};

export default MemoryPage;
