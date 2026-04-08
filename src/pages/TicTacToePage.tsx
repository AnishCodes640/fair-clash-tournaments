import { useState, useCallback } from "react";
import { ArrowLeft, RotateCcw, Cpu } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ticTacToeLogo from "@/assets/tic-tac-toe-logo.jpg";

type Cell = "X" | "O" | null;
type Difficulty = "easy" | "normal" | "hard";

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: Cell[]): { winner: Cell; line: number[] | null } {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
}

function getAIMove(board: Cell[], difficulty: Difficulty): number {
  const empty = board.map((c, i) => c === null ? i : -1).filter(i => i >= 0);
  if (empty.length === 0) return -1;

  if (difficulty === "easy") {
    // 30% chance of smart move
    if (Math.random() > 0.3) return empty[Math.floor(Math.random() * empty.length)];
  }

  if (difficulty === "normal") {
    // 60% chance of smart move
    if (Math.random() > 0.6) return empty[Math.floor(Math.random() * empty.length)];
  }

  // Smart/minimax move
  return bestMove(board);
}

function bestMove(board: Cell[]): number {
  let best = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    board[i] = "O";
    const score = minimax(board, false, 0);
    board[i] = null;
    if (score > best) { best = score; move = i; }
  }
  return move;
}

function minimax(board: Cell[], isMax: boolean, depth: number): number {
  const { winner } = checkWinner(board);
  if (winner === "O") return 10 - depth;
  if (winner === "X") return depth - 10;
  if (board.every(c => c !== null)) return 0;

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] !== null) continue;
      board[i] = "O";
      best = Math.max(best, minimax(board, false, depth + 1));
      board[i] = null;
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] !== null) continue;
      board[i] = "X";
      best = Math.min(best, minimax(board, true, depth + 1));
      board[i] = null;
    }
    return best;
  }
}

const TicTacToePage = () => {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [gameOver, setGameOver] = useState(false);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [scores, setScores] = useState({ player: 0, ai: 0, draw: 0 });
  const [thinking, setThinking] = useState(false);

  const resetBoard = useCallback(() => {
    setBoard(Array(9).fill(null));
    setGameOver(false);
    setWinLine(null);
    setThinking(false);
  }, []);

  const handleClick = useCallback((idx: number) => {
    if (board[idx] || gameOver || thinking) return;

    const newBoard = [...board];
    newBoard[idx] = "X";

    const { winner, line } = checkWinner(newBoard);
    if (winner) {
      setBoard(newBoard);
      setWinLine(line);
      setGameOver(true);
      setScores(s => ({ ...s, player: s.player + 1 }));
      toast.success("You win! 🎉");
      return;
    }
    if (newBoard.every(c => c !== null)) {
      setBoard(newBoard);
      setGameOver(true);
      setScores(s => ({ ...s, draw: s.draw + 1 }));
      toast("It's a draw!");
      return;
    }

    setBoard(newBoard);
    setThinking(true);

    setTimeout(() => {
      const aiIdx = getAIMove(newBoard, difficulty);
      if (aiIdx >= 0) {
        newBoard[aiIdx] = "O";
        const { winner: w2, line: l2 } = checkWinner(newBoard);
        setBoard([...newBoard]);
        if (w2) {
          setWinLine(l2);
          setGameOver(true);
          setScores(s => ({ ...s, ai: s.ai + 1 }));
          toast.error("AI wins! 🤖");
        } else if (newBoard.every(c => c !== null)) {
          setGameOver(true);
          setScores(s => ({ ...s, draw: s.draw + 1 }));
          toast("It's a draw!");
        }
      }
      setThinking(false);
    }, 400);
  }, [board, gameOver, thinking, difficulty]);

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/games" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Tic Tac Toe</h1>
          <p className="text-[10px] text-muted-foreground">Practice Mode · No Betting</p>
        </div>
      </div>

      {/* Difficulty */}
      <div className="surface-card rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Difficulty</p>
        <div className="flex gap-2">
          {(["easy", "normal", "hard"] as Difficulty[]).map(d => (
            <button key={d} onClick={() => { setDifficulty(d); resetBoard(); }}
              className={cn("flex-1 h-9 rounded-lg text-xs font-medium capitalize transition-all",
                difficulty === d ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="surface-card rounded-lg p-3">
          <p className="text-lg font-bold text-primary font-mono-num">{scores.player}</p>
          <p className="text-[10px] text-muted-foreground">You (X)</p>
        </div>
        <div className="surface-card rounded-lg p-3">
          <p className="text-lg font-bold text-muted-foreground font-mono-num">{scores.draw}</p>
          <p className="text-[10px] text-muted-foreground">Draw</p>
        </div>
        <div className="surface-card rounded-lg p-3">
          <p className="text-lg font-bold text-destructive font-mono-num">{scores.ai}</p>
          <p className="text-[10px] text-muted-foreground">AI (O)</p>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-2 max-w-[300px] mx-auto">
        {board.map((cell, idx) => {
          const isWin = winLine?.includes(idx);
          return (
            <button key={idx} onClick={() => handleClick(idx)}
              disabled={!!cell || gameOver || thinking}
              className={cn(
                "aspect-square rounded-xl text-3xl font-bold flex items-center justify-center transition-all duration-200",
                "border-2 active:scale-95",
                cell === "X" ? "text-primary border-primary/30 bg-primary/5" :
                  cell === "O" ? "text-destructive border-destructive/30 bg-destructive/5" :
                    "border-border bg-card hover:border-primary/30 hover:bg-primary/5",
                isWin && "ring-2 ring-success bg-success/10 border-success/50",
                !cell && !gameOver && !thinking && "cursor-pointer"
              )}>
              {cell === "X" && <span className="animate-scale-in">✕</span>}
              {cell === "O" && <span className="animate-scale-in">○</span>}
            </button>
          );
        })}
      </div>

      {thinking && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Cpu className="h-3.5 w-3.5 animate-spin" /> AI is thinking...
        </div>
      )}

      {gameOver && (
        <button onClick={resetBoard}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <RotateCcw className="h-4 w-4" /> Play Again
        </button>
      )}
    </div>
  );
};

export default TicTacToePage;
