import { useState, useCallback } from "react";
import { ArrowLeft, RotateCcw, Lightbulb, Eraser } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Difficulty = "easy" | "medium" | "hard";
const REMOVE_MAP: Record<Difficulty, number> = { easy: 30, medium: 40, hard: 50 };

function generateSudoku(): number[][] {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  function isValid(b: number[][], r: number, c: number, n: number) {
    for (let i = 0; i < 9; i++) { if (b[r][i] === n || b[i][c] === n) return false; }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let i = br; i < br + 3; i++) for (let j = bc; j < bc + 3; j++) if (b[i][j] === n) return false;
    return true;
  }
  function fill(b: number[][]): boolean {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (b[r][c] === 0) {
        const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
        for (const n of nums) { if (isValid(b, r, c, n)) { b[r][c] = n; if (fill(b)) return true; b[r][c] = 0; } }
        return false;
      }
    }
    return true;
  }
  fill(board);
  return board;
}

function createPuzzle(solution: number[][], remove: number): { puzzle: number[][]; fixed: boolean[][] } {
  const puzzle = solution.map(r => [...r]);
  const fixed = Array.from({ length: 9 }, () => Array(9).fill(true));
  const cells = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5);
  for (let i = 0; i < remove; i++) {
    const idx = cells[i]; const r = Math.floor(idx / 9), c = idx % 9;
    puzzle[r][c] = 0; fixed[r][c] = false;
  }
  return { puzzle, fixed };
}

const SudokuPage = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [solution, setSolution] = useState<number[][]>([]);
  const [board, setBoard] = useState<number[][]>([]);
  const [fixed, setFixed] = useState<boolean[][]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [won, setWon] = useState(false);
  const [hints, setHints] = useState(3);

  const newGame = useCallback((diff: Difficulty) => {
    const sol = generateSudoku();
    const { puzzle, fixed: fx } = createPuzzle(sol, REMOVE_MAP[diff]);
    setSolution(sol); setBoard(puzzle); setFixed(fx);
    setSelected(null); setErrors(new Set()); setWon(false); setHints(3);
  }, []);

  useState(() => { newGame(difficulty); });

  const handleNumber = (n: number) => {
    if (!selected || won) return;
    const [r, c] = selected;
    if (fixed[r][c]) return;
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = n;
    setBoard(newBoard);
    const newErrors = new Set(errors);
    if (n !== solution[r][c]) { newErrors.add(`${r},${c}`); } else { newErrors.delete(`${r},${c}`); }
    setErrors(newErrors);
    // Check win
    let complete = true;
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) if (newBoard[i][j] !== solution[i][j]) complete = false;
    if (complete) { setWon(true); toast.success("Sudoku solved! 🎉"); }
  };

  const handleHint = () => {
    if (hints <= 0 || !selected || won) return;
    const [r, c] = selected;
    if (fixed[r][c]) return;
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = solution[r][c];
    setBoard(newBoard);
    const newErrors = new Set(errors);
    newErrors.delete(`${r},${c}`);
    setErrors(newErrors);
    setHints(h => h - 1);
  };

  const handleErase = () => {
    if (!selected || won) return;
    const [r, c] = selected;
    if (fixed[r][c]) return;
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = 0;
    setBoard(newBoard);
    const newErrors = new Set(errors);
    newErrors.delete(`${r},${c}`);
    setErrors(newErrors);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/games" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <div><h1 className="text-xl font-bold tracking-tight">🔢 Sudoku</h1><p className="text-[10px] text-muted-foreground">Practice Mode · Free</p></div>
      </div>

      <div className="flex gap-2">
        {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
          <button key={d} onClick={() => { setDifficulty(d); newGame(d); }}
            className={cn("flex-1 h-8 rounded-lg text-xs font-medium capitalize transition-all",
              difficulty === d ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
            {d}
          </button>
        ))}
      </div>

      {/* Board */}
      <div className="w-full aspect-square max-w-[360px] mx-auto">
        <div className="grid grid-cols-9 border-2 border-foreground/30 rounded-lg overflow-hidden">
          {board.map((row, r) => row.map((cell, c) => {
            const isSelected = selected?.[0] === r && selected?.[1] === c;
            const isSameRow = selected?.[0] === r;
            const isSameCol = selected?.[1] === c;
            const isSameBox = selected && Math.floor(selected[0] / 3) === Math.floor(r / 3) && Math.floor(selected[1] / 3) === Math.floor(c / 3);
            const isError = errors.has(`${r},${c}`);
            const borderR = (c + 1) % 3 === 0 && c < 8 ? "border-r-2 border-r-foreground/30" : "border-r border-r-border";
            const borderB = (r + 1) % 3 === 0 && r < 8 ? "border-b-2 border-b-foreground/30" : "border-b border-b-border";
            return (
              <button key={`${r}-${c}`} onClick={() => setSelected([r, c])}
                className={cn("aspect-square flex items-center justify-center text-sm font-bold transition-all", borderR, borderB,
                  isSelected ? "bg-primary/20" : (isSameRow || isSameCol || isSameBox) ? "bg-accent/50" : "bg-card",
                  isError && "text-destructive bg-destructive/10",
                  fixed[r]?.[c] ? "text-foreground" : "text-primary",
                )}>
                {cell > 0 ? cell : ""}
              </button>
            );
          }))}
        </div>
      </div>

      {/* Number pad */}
      <div className="grid grid-cols-9 gap-1 max-w-[360px] mx-auto">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => handleNumber(n)}
            className="aspect-square rounded-lg bg-secondary text-sm font-bold flex items-center justify-center hover:bg-primary/10 active:scale-95 transition-all">
            {n}
          </button>
        ))}
      </div>

      <div className="flex gap-2 max-w-[360px] mx-auto">
        <button onClick={handleErase} className="flex-1 h-9 rounded-lg bg-secondary text-xs font-medium flex items-center justify-center gap-1.5">
          <Eraser className="h-3.5 w-3.5" /> Erase
        </button>
        <button onClick={handleHint} disabled={hints <= 0} className="flex-1 h-9 rounded-lg bg-secondary text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
          <Lightbulb className="h-3.5 w-3.5" /> Hint ({hints})
        </button>
        <button onClick={() => newGame(difficulty)} className="flex-1 h-9 rounded-lg bg-secondary text-xs font-medium flex items-center justify-center gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> New
        </button>
      </div>

      {won && (
        <div className="surface-card rounded-xl p-6 text-center space-y-3 border border-success/30">
          <p className="text-lg font-bold text-success">🎉 Sudoku Solved!</p>
          <button onClick={() => newGame(difficulty)}
            className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Play Again</button>
        </div>
      )}
    </div>
  );
};

export default SudokuPage;
