import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, RotateCcw, Pause, Play, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import snakeLogo from "@/assets/snake-logo.jpg";
import { SEO } from "@/components/SEO";

const GRID = 20;
const CELL_SIZE = 100 / GRID;
const SPEED_MAP = { easy: 180, normal: 120, hard: 70 };

type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Difficulty = "easy" | "normal" | "hard";
const OPP: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };

const SnakePage = () => {
  const [snake, setSnake] = useState<[number, number][]>([[10, 10]]);
  const [food, setFood] = useState<[number, number]>([5, 5]);
  const [dir, setDir] = useState<Dir>("RIGHT");
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("snake_hs") || 0));
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const dirRef = useRef<Dir>("RIGHT");
  const dirChangedRef = useRef(false);
  const intervalRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const spawnFood = useCallback((snk: [number, number][]): [number, number] => {
    let f: [number, number];
    do { f = [Math.floor(Math.random() * GRID), Math.floor(Math.random() * GRID)]; }
    while (snk.some(([x, y]) => x === f[0] && y === f[1]));
    return f;
  }, []);

  const reset = useCallback(() => {
    const s: [number, number][] = [[10, 10]];
    setSnake(s); setFood(spawnFood(s)); setDir("RIGHT"); dirRef.current = "RIGHT";
    setGameOver(false); setScore(0); setPaused(false); setStarted(true);
  }, [spawnFood]);

  useEffect(() => {
    if (!started || gameOver || paused) return;
    intervalRef.current = window.setInterval(() => {
      dirChangedRef.current = false;
      setSnake(prev => {
        const [hx, hy] = prev[0];
        let nx = hx, ny = hy;
        const d = dirRef.current;
        if (d === "UP") ny--; else if (d === "DOWN") ny++;
        else if (d === "LEFT") nx--; else nx++;
        if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID || prev.some(([x, y]) => x === nx && y === ny)) {
          setGameOver(true);
          setScore(s => {
            if (s > highScore) { localStorage.setItem("snake_hs", String(s)); setHighScore(s); }
            return s;
          });
          return prev;
        }
        const newSnake: [number, number][] = [[nx, ny], ...prev];
        setFood(f => {
          if (nx === f[0] && ny === f[1]) {
            setScore(s => s + 1);
            const nf = spawnFood(newSnake);
            setTimeout(() => setFood(nf), 0);
            return f;
          }
          newSnake.pop();
          return f;
        });
        return newSnake;
      });
    }, SPEED_MAP[difficulty]);
    return () => clearInterval(intervalRef.current);
  }, [started, gameOver, paused, difficulty, highScore, spawnFood]);

  const changeDir = useCallback((nd: Dir) => {
    if (dirChangedRef.current) return;
    if (nd !== OPP[dirRef.current]) {
      dirRef.current = nd;
      setDir(nd);
      dirChangedRef.current = true;
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT", w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT" };
      const nd = map[e.key];
      if (!nd) return;
      e.preventDefault();
      changeDir(nd);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [changeDir]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const MIN_SWIPE = 20;
    if (Math.abs(dx) < MIN_SWIPE && Math.abs(dy) < MIN_SWIPE) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      changeDir(dx > 0 ? "RIGHT" : "LEFT");
    } else {
      changeDir(dy > 0 ? "DOWN" : "UP");
    }
    touchStartRef.current = null;
  }, [changeDir]);

  // Alternating green grass-like grid
  const getCellColor = (x: number, y: number) => {
    return (x + y) % 2 === 0 ? "#4ade80" : "#22c55e";
  };

  return (
    <>
      <SEO title="Snake — Classic Arcade Game — FairClash" description="Play the classic Snake arcade game online on FairClash. Three difficulty levels and high-score tracking." path="/snake" jsonLd={{"@context":"https://schema.org","@type":"Game","name":"Snake","url":"https://fair-clash-beta.lovable.app/snake","provider":{"@type":"Organization","name":"Fair Fun Studios"},"genre":"Online Game"}} />
      <div className="max-w-md mx-auto px-4 py-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/games" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <img src={snakeLogo} alt="Snake" className="h-10 w-10 rounded-xl object-cover" />
        <div><h1 className="text-xl font-bold tracking-tight">Snake</h1><p className="text-[10px] text-muted-foreground">Practice Mode · Free</p></div>
      </div>

      <div className="flex gap-2">
        {(["easy", "normal", "hard"] as Difficulty[]).map(d => (
          <button key={d} onClick={() => { setDifficulty(d); if (started) reset(); }}
            className={cn("flex-1 h-8 rounded-lg text-xs font-medium capitalize transition-all",
              difficulty === d ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
            {d}
          </button>
        ))}
      </div>

      <div className="flex justify-between text-xs">
        <span>Score: <strong className="font-mono-num text-primary">{score}</strong></span>
        <span>Best: <strong className="font-mono-num text-warning">{highScore}</strong></span>
      </div>

      <div
        className="relative w-full aspect-square rounded-xl overflow-hidden border-2 border-green-700"
        style={{ touchAction: "none" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Grass-like alternating green grid */}
          {Array.from({ length: GRID }).map((_, x) =>
            Array.from({ length: GRID }).map((_, y) => (
              <rect key={`${x}-${y}`}
                x={x * CELL_SIZE} y={y * CELL_SIZE}
                width={CELL_SIZE} height={CELL_SIZE}
                fill={getCellColor(x, y)} />
            ))
          )}
          {/* Food */}
          <circle cx={food[0] * CELL_SIZE + CELL_SIZE / 2} cy={food[1] * CELL_SIZE + CELL_SIZE / 2}
            r={CELL_SIZE * 0.4} fill="#ef4444" className="animate-pulse" />
          <circle cx={food[0] * CELL_SIZE + CELL_SIZE / 2 - 0.5} cy={food[1] * CELL_SIZE + CELL_SIZE / 2 - 0.8}
            r={CELL_SIZE * 0.12} fill="#dc2626" />
          {/* Snake */}
          {snake.map(([x, y], i) => (
            <rect key={i} x={x * CELL_SIZE + 0.2} y={y * CELL_SIZE + 0.2}
              width={CELL_SIZE - 0.4} height={CELL_SIZE - 0.4} rx="1"
              fill={i === 0 ? "#1d4ed8" : "#3b82f6"}
              stroke={i === 0 ? "#1e40af" : "transparent"} strokeWidth="0.3" />
          ))}
          {/* Snake eyes on head */}
          {snake.length > 0 && (() => {
            const [hx, hy] = snake[0];
            const cx = hx * CELL_SIZE + CELL_SIZE / 2;
            const cy = hy * CELL_SIZE + CELL_SIZE / 2;
            return (
              <>
                <circle cx={cx - 1} cy={cy - 0.8} r={0.7} fill="white" />
                <circle cx={cx + 1} cy={cy - 0.8} r={0.7} fill="white" />
                <circle cx={cx - 1} cy={cy - 0.8} r={0.35} fill="#1e293b" />
                <circle cx={cx + 1} cy={cy - 0.8} r={0.35} fill="#1e293b" />
              </>
            );
          })()}
        </svg>

        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <img src={snakeLogo} alt="Snake" className="h-14 w-14 rounded-2xl object-cover mb-3" />
            <p className="text-lg font-bold mb-3">Snake Game</p>
            <button onClick={reset} className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Start Game</button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <p className="text-lg font-bold text-destructive mb-1">Game Over!</p>
            <p className="text-sm text-muted-foreground mb-3">Score: {score}</p>
            <button onClick={reset} className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2">
              <RotateCcw className="h-4 w-4" /> Play Again
            </button>
          </div>
        )}
      </div>

      {/* D-pad with icons instead of arrows */}
      <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
        <div />
        <button onClick={() => changeDir("UP")} className="h-12 rounded-lg bg-secondary flex items-center justify-center active:scale-95 active:bg-primary/20 transition-all">
          <ChevronUp className="h-5 w-5" />
        </button>
        <div />
        <button onClick={() => changeDir("LEFT")} className="h-12 rounded-lg bg-secondary flex items-center justify-center active:scale-95 active:bg-primary/20 transition-all">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button onClick={() => setPaused(!paused)} className="h-12 rounded-lg bg-secondary flex items-center justify-center active:scale-95 transition-all">
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
        <button onClick={() => changeDir("RIGHT")} className="h-12 rounded-lg bg-secondary flex items-center justify-center active:scale-95 active:bg-primary/20 transition-all">
          <ChevronRight className="h-5 w-5" />
        </button>
        <div />
        <button onClick={() => changeDir("DOWN")} className="h-12 rounded-lg bg-secondary flex items-center justify-center active:scale-95 active:bg-primary/20 transition-all">
          <ChevronDown className="h-5 w-5" />
        </button>
        <div />
      </div>
      <p className="text-[10px] text-center text-muted-foreground">Swipe on the board or use buttons to control</p>
    </div>
    </>
  );
};

export default SnakePage;
