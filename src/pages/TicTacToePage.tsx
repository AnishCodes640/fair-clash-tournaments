import { useState, useCallback } from "react";
import { ArrowLeft, RotateCcw, Cpu, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { playSound } from "@/lib/soundManager";
import ticTacToeLogo from "@/assets/tic-tac-toe-logo.jpg";

type Cell = "X" | "O" | null;
type Difficulty = "easy" | "normal" | "hard";
type GameMode = "ai" | "local";

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
  if (difficulty === "easy" && Math.random() > 0.3) return empty[Math.floor(Math.random() * empty.length)];
  if (difficulty === "normal" && Math.random() > 0.6) return empty[Math.floor(Math.random() * empty.length)];
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
    for (let i = 0; i < 9; i++) { if (board[i] !== null) continue; board[i] = "O"; best = Math.max(best, minimax(board, false, depth + 1)); board[i] = null; }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) { if (board[i] !== null) continue; board[i] = "X"; best = Math.min(best, minimax(board, true, depth + 1)); board[i] = null; }
    return best;
  }
}

const TicTacToePage = () => {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [gameMode, setGameMode] = useState<GameMode>("ai");
  const [gameOver, setGameOver] = useState(false);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [scores, setScores] = useState({ p1: 0, p2: 0, draw: 0 });
  const [thinking, setThinking] = useState(false);
  const [currentTurn, setCurrentTurn] = useState<"X" | "O">("X");

  const resetBoard = useCallback(() => {
    setBoard(Array(9).fill(null));
    setGameOver(false);
    setWinLine(null);
    setThinking(false);
    setCurrentTurn("X");
  }, []);

  const handleClick = useCallback((idx: number) => {
    if (board[idx] || gameOver || thinking) return;
    playSound("click");

    const newBoard = [...board];
    newBoard[idx] = currentTurn;

    const { winner, line } = checkWinner(newBoard);
    if (winner) {
      setBoard(newBoard);
      setWinLine(line);
      setGameOver(true);
      playSound("win");
      if (winner === "X") {
        setScores(s => ({ ...s, p1: s.p1 + 1 }));
        toast.success(gameMode === "local" ? "Player 1 (X) wins!" : "You win! 🎉");
      } else {
        setScores(s => ({ ...s, p2: s.p2 + 1 }));
        toast.success(gameMode === "local" ? "Player 2 (O) wins!" : "AI wins! 🤖");
      }
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

    if (gameMode === "local") {
      setCurrentTurn(currentTurn === "X" ? "O" : "X");
      return;
    }

    // AI mode
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
          setScores(s => ({ ...s, p2: s.p2 + 1 }));
          playSound("lose");
          toast.error("AI wins! 🤖");
        } else if (newBoard.every(c => c !== null)) {
          setGameOver(true);
          setScores(s => ({ ...s, draw: s.draw + 1 }));
          toast("It's a draw!");
        }
      }
      setThinking(false);
    }, 400);
  }, [board, gameOver, thinking, difficulty, gameMode, currentTurn]);

  const p1Label = gameMode === "local" ? "P1 (X)" : "You (X)";
  const p2Label = gameMode === "local" ? "P2 (O)" : "AI (O)";

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/games" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <img src={ticTacToeLogo} alt="Tic Tac Toe" className="h-10 w-10 rounded-xl object-cover" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">Tic Tac Toe</h1>
          <p className="text-[10px] text-muted-foreground">Practice Mode · Free</p>
        </div>
      </div>

      {/* Game Mode */}
      <div className="surface-card rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Game Mode</p>
        <div className="flex gap-2">
          <button onClick={() => { setGameMode("ai"); resetBoard(); setScores({ p1: 0, p2: 0, draw: 0 }); }}
            className={cn("flex-1 h-9 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all",
              gameMode === "ai" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}>
            <Cpu className="h-3.5 w-3.5" /> vs AI
          </button>
          <button onClick={() => { setGameMode("local"); resetBoard(); setScores({ p1: 0, p2: 0, draw: 0 }); }}
            className={cn("flex-1 h-9 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all",
              gameMode === "local" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}>
            <Users className="h-3.5 w-3.5" /> 2 Players
          </button>
        </div>
      </div>

      {/* Difficulty (AI only) */}
      {gameMode === "ai" && (
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
      )}

      {/* Turn Indicator (local mode) */}
      {gameMode === "local" && !gameOver && (
        <div className={cn("text-center py-2 rounded-lg text-sm font-semibold transition-all",
          currentTurn === "X" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
          {currentTurn === "X" ? "Player 1's Turn (X)" : "Player 2's Turn (O)"}
        </div>
      )}

      {/* Scoreboard */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="surface-card rounded-lg p-3">
          <p className="text-lg font-bold text-primary font-mono-num">{scores.p1}</p>
          <p className="text-[10px] text-muted-foreground">{p1Label}</p>
        </div>
        <div className="surface-card rounded-lg p-3">
          <p className="text-lg font-bold text-muted-foreground font-mono-num">{scores.draw}</p>
          <p className="text-[10px] text-muted-foreground">Draw</p>
        </div>
        <div className="surface-card rounded-lg p-3">
          <p className="text-lg font-bold text-destructive font-mono-num">{scores.p2}</p>
          <p className="text-[10px] text-muted-foreground">{p2Label}</p>
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
