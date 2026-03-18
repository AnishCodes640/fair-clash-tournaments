import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { placeBet, addWinnings, getWalletBalance } from "@/lib/walletApi";
import { Plane, TrendingUp, History, Wallet, AlertCircle, Users, DollarSign, Timer, BookOpen, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import aviatorLogo from "@/assets/aviator-logo.jpg";

type GamePhase = "waiting" | "flying" | "crashed" | "cashed_out";

interface RoundHistory { multiplier: number; crashed: boolean; bet: number; won: number; }

function generateCrashPoint(): number {
  // House edge ~5%. Crash point = 0.99 / (1 - random), capped
  const r = Math.random();
  const raw = 0.99 / (1 - r);
  // Cap at 50x, floor at 1.01
  return Math.min(Math.max(raw, 1.01), 50);
}

const AviatorPage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(0);
  const [betAmount, setBetAmount] = useState("");
  const [currentBet, setCurrentBet] = useState(0);
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [balance, setBalance] = useState(0);
  const [countdown, setCountdown] = useState(7);
  const [showRules, setShowRules] = useState(false);
  const [fakePlayers, setFakePlayers] = useState(0);
  const [fakeTotalBets, setFakeTotalBets] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const crashPointRef = useRef(0);
  const phaseRef = useRef<GamePhase>("waiting");

  // Keep phaseRef in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    if (user) getWalletBalance(user.id).then(setBalance);
  }, [user]);

  useEffect(() => {
    if (profile) setBalance(Number(profile.wallet_balance || 0));
  }, [profile]);

  useEffect(() => {
    setFakePlayers(Math.floor(Math.random() * 80) + 20);
    setFakeTotalBets(Math.floor(Math.random() * 15000) + 3000);
  }, [phase]);

  const drawGraph = useCallback((currentMult: number, crashed: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, "#0a1628");
    bgGrad.addColorStop(1, "#0d1f3c");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "rgba(56,189,248,0.06)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const y = h - (h * i) / 6;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Curve
    const points: [number, number][] = [];
    const maxMult = Math.max(currentMult, 1.1);
    const steps = 150;
    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      const mult = 1 + (maxMult - 1) * Math.pow(frac, 1.5); // Slow start, accelerating
      if (mult > currentMult) break;
      const x = frac * w * 0.88 + w * 0.06;
      const yNorm = (mult - 1) / Math.max(maxMult - 1, 0.1);
      const y = h - yNorm * h * 0.78 - h * 0.1;
      points.push([x, y]);
    }

    if (points.length > 1) {
      const gradient = ctx.createLinearGradient(0, h, 0, 0);
      if (crashed) {
        gradient.addColorStop(0, "rgba(239,68,68,0.0)");
        gradient.addColorStop(1, "rgba(239,68,68,0.15)");
      } else {
        gradient.addColorStop(0, "rgba(56,189,248,0.0)");
        gradient.addColorStop(1, "rgba(56,189,248,0.2)");
      }

      ctx.beginPath();
      ctx.moveTo(points[0][0], h);
      points.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(points[points.length - 1][0], h);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.shadowColor = crashed ? "#ef4444" : "#38bdf8";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i - 1][0] + points[i][0]) / 2;
        const yc = (points[i - 1][1] + points[i][1]) / 2;
        ctx.quadraticCurveTo(points[i - 1][0], points[i - 1][1], xc, yc);
      }
      ctx.strokeStyle = crashed ? "#ef4444" : "#38bdf8";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Plane emoji at tip
      const tip = points[points.length - 1];
      ctx.font = "28px serif";
      ctx.fillStyle = crashed ? "#ef4444" : "#38bdf8";
      ctx.fillText(crashed ? "💥" : "✈️", tip[0] - 14, tip[1] + 8);
    }

    // Central multiplier text
    ctx.shadowColor = crashed ? "#ef4444" : "#38bdf8";
    ctx.shadowBlur = 20;
    ctx.font = `bold ${crashed ? 42 : 50}px 'Inter', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = crashed ? "#ef4444" : "#38bdf8";
    ctx.fillText(`${currentMult.toFixed(2)}x`, w / 2, h * 0.45);
    ctx.shadowBlur = 0;

    if (crashed) {
      ctx.font = "bold 16px 'Inter', sans-serif";
      ctx.fillStyle = "#ef4444";
      ctx.fillText("CRASHED!", w / 2, h * 0.45 + 30);
    }
  }, []);

  const startRound = useCallback(() => {
    const cp = generateCrashPoint();
    crashPointRef.current = cp;
    setCrashPoint(cp);
    setPhase("flying");
    setMultiplier(1.0);
    startTimeRef.current = performance.now();

    const animate = (time: number) => {
      const elapsed = (time - startTimeRef.current) / 1000;
      // Slower growth: e^(0.12t) — more suspense
      const currentMult = Math.pow(Math.E, elapsed * 0.12);

      if (currentMult >= crashPointRef.current) {
        setMultiplier(crashPointRef.current);
        setPhase("crashed");
        drawGraph(crashPointRef.current, true);
        return;
      }

      setMultiplier(currentMult);
      drawGraph(currentMult, false);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
  }, [drawGraph]);

  // Countdown & auto-start
  useEffect(() => {
    if (phase === "waiting") {
      drawGraph(1.0, false);
      setCountdown(7);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(interval); startRound(); return 7; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase, startRound, drawGraph]);

  useEffect(() => { return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }; }, []);

  // Handle crash result
  useEffect(() => {
    if (phase === "crashed") {
      if (currentBet > 0) {
        setHistory((prev) => [{ multiplier: crashPoint, crashed: true, bet: currentBet, won: 0 }, ...prev.slice(0, 19)]);
        if (user) {
          supabase.from("game_sessions").insert({ user_id: user.id, game_id: "aviator", game_title: "Aviator Crash", bet_amount: currentBet, win_amount: 0, result: "loss" });
        }
        setCurrentBet(0);
        toast.error(`Crashed at ${crashPoint.toFixed(2)}x — Bet lost!`);
      } else {
        setHistory((prev) => [{ multiplier: crashPoint, crashed: true, bet: 0, won: 0 }, ...prev.slice(0, 19)]);
      }
      const timeout = setTimeout(() => { setPhase("waiting"); }, 3500);
      return () => clearTimeout(timeout);
    }
  }, [phase, crashPoint, currentBet, user]);

  const handlePlaceBet = async () => {
    if (!user) { navigate("/auth"); return; }
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount < 10) { toast.error("Minimum bet is ₹10"); return; }
    if (amount > balance) {
      toast.error("Insufficient balance. Please deposit first.");
      return;
    }

    const result = await placeBet(user.id, amount, "Aviator Crash");
    if (!result.success) { toast.error(result.error || "Bet failed"); return; }
    setCurrentBet(amount);
    setBalance(result.newBalance || 0);
    toast.success(`Bet placed: ₹${amount}`);
  };

  const handleCashout = async () => {
    if (!user || currentBet <= 0 || phaseRef.current !== "flying") return;
    const winAmount = Math.round(currentBet * multiplier * 100) / 100;
    const result = await addWinnings(user.id, winAmount, "Aviator Crash");
    if (!result.success) { toast.error("Cashout failed"); return; }

    setBalance(result.newBalance || 0);
    setHistory((prev) => [{ multiplier, crashed: false, bet: currentBet, won: winAmount }, ...prev.slice(0, 19)]);
    setPhase("cashed_out");
    setCurrentBet(0);

    await supabase.from("game_sessions").insert({ user_id: user.id, game_id: "aviator", game_title: "Aviator Crash", bet_amount: currentBet, win_amount: winAmount, result: "win" });
    toast.success(`Cashed out at ${multiplier.toFixed(2)}x — Won ₹${winAmount.toFixed(2)}!`);
    await refreshProfile();

    // Continue animation until crash
    const continueAnim = (time: number) => {
      const elapsed = (time - startTimeRef.current) / 1000;
      const currentMult = Math.pow(Math.E, elapsed * 0.12);
      if (currentMult >= crashPointRef.current) {
        setMultiplier(crashPointRef.current);
        drawGraph(crashPointRef.current, true);
        setTimeout(() => { setPhase("waiting"); }, 3500);
        return;
      }
      setMultiplier(currentMult);
      drawGraph(currentMult, false);
      animationRef.current = requestAnimationFrame(continueAnim);
    };
    cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(continueAnim);
  };

  const quickBets = [10, 50, 100, 500];

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
        <div className="surface-card rounded-lg p-8 flex flex-col items-center text-center">
          <img src={aviatorLogo} alt="Aviator" className="h-20 w-20 rounded-2xl object-cover mb-4" />
          <h2 className="text-lg font-semibold mb-2">Aviator Crash</h2>
          <p className="text-sm text-muted-foreground mb-4">Sign in to play</p>
          <button onClick={() => navigate("/auth")} className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Sign In</button>
        </div>
      </div>
    );
  }

  const canPlaceBet = (phase === "waiting" || phase === "flying") && currentBet === 0 && balance >= 10;
  const canCashout = phase === "flying" && currentBet > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/games" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
          <img src={aviatorLogo} alt="Aviator" className="h-10 w-10 rounded-xl object-cover" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">Aviator Crash</h1>
            <p className="text-[10px] text-muted-foreground">FairClash Tournaments</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5">
          <Wallet className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono-num text-sm font-semibold">₹{balance.toFixed(2)}</span>
        </div>
      </div>

      {/* Rules toggle */}
      <button onClick={() => setShowRules(!showRules)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
        <BookOpen className="h-3 w-3" /> {showRules ? "Hide" : "Show"} Game Rules
      </button>

      {showRules && (
        <div className="surface-card rounded-xl p-4 space-y-2 text-xs text-muted-foreground border-l-2 border-l-primary animate-fade-in">
          <p className="text-foreground font-medium text-sm">How to Play Aviator</p>
          <ul className="space-y-1 list-disc pl-4">
            <li>Place your bet during countdown OR while the plane is flying</li>
            <li>The multiplier starts at 1.00x and increases slowly, then faster</li>
            <li>Hit <strong>CASH OUT</strong> before the plane crashes to win your bet × multiplier</li>
            <li>If you don't cash out before the crash, you lose your bet</li>
            <li>Minimum bet: ₹10 · Winnings added to wallet instantly</li>
            <li>Most rounds crash between 1.2x–3x. Big multipliers (5x+) are rare!</li>
          </ul>
        </div>
      )}

      {/* Live stats bar */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {fakePlayers} playing</span>
        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> ₹{fakeTotalBets.toLocaleString()} total bets</span>
        <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {history.length} rounds</span>
      </div>

      {/* Game Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-border">
        <canvas ref={canvasRef} className="w-full aspect-[16/9]" />

        {phase === "waiting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a1628]/90 backdrop-blur-sm">
            <Plane className="h-10 w-10 text-primary animate-bounce mb-3" />
            <p className="text-sm text-muted-foreground">Next round in</p>
            <p className="text-5xl font-bold text-primary font-mono-num">{countdown}s</p>
            <p className="text-[10px] text-muted-foreground mt-2">Place your bet now!</p>
          </div>
        )}

        {phase === "cashed_out" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-success/90 text-success-foreground px-4 py-2 rounded-lg text-sm font-bold glow-success">
            ✓ Cashed Out!
          </div>
        )}
      </div>

      {/* CASHOUT BUTTON - prominent when active */}
      {canCashout && (
        <button onClick={handleCashout}
          className="w-full h-14 rounded-xl bg-success text-success-foreground text-lg font-bold animate-pulse-glow flex items-center justify-center gap-2 transition-all active:scale-95">
          💰 CASH OUT — ₹{(currentBet * multiplier).toFixed(0)}
        </button>
      )}

      {/* Active bet indicator */}
      {currentBet > 0 && phase === "flying" && (
        <div className="surface-card rounded-lg p-3 flex items-center justify-between border border-success/30">
          <div className="text-xs">
            <span className="text-muted-foreground">Active Bet:</span>
            <span className="ml-1 font-bold font-mono-num text-foreground">₹{currentBet}</span>
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Potential Win:</span>
            <span className="ml-1 font-bold font-mono-num text-success">₹{(currentBet * multiplier).toFixed(0)}</span>
          </div>
        </div>
      )}

      {/* History strip */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
        {history.slice(0, 15).map((h, i) => (
          <span key={i} className={cn("px-2 py-1 rounded-md text-[10px] font-bold font-mono-num whitespace-nowrap flex-shrink-0",
            h.crashed && h.bet > 0 ? "bg-destructive/10 text-destructive" : !h.crashed ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
          )}>{h.multiplier.toFixed(2)}x</span>
        ))}
        {history.length === 0 && <span className="text-xs text-muted-foreground">No rounds played yet</span>}
      </div>

      {/* Insufficient balance warning */}
      {balance < 10 && (
        <div className="surface-card rounded-xl p-3 flex items-center gap-2 border-l-2 border-l-warning animate-fade-in">
          <AlertCircle className="h-4 w-4 text-warning flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-warning font-medium">Insufficient balance</p>
            <p className="text-[10px] text-muted-foreground">Minimum ₹10 required to play</p>
          </div>
          <Link to="/wallet" className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[10px] font-medium flex items-center">Deposit</Link>
        </div>
      )}

      {/* Betting Controls */}
      <div className="surface-card rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Bet Amount (₹)</label>
            <input type="number" min={10} value={betAmount} onChange={(e) => setBetAmount(e.target.value)} placeholder="Min ₹10"
              disabled={currentBet > 0}
              className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm font-mono-num focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50" />
          </div>
          <div className="flex flex-col justify-end">
            <button onClick={handlePlaceBet}
              disabled={!canPlaceBet}
              className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 whitespace-nowrap">
              {currentBet > 0 ? `Bet: ₹${currentBet}` : "Place Bet"}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          {quickBets.map((qb) => (
            <button key={qb} onClick={() => setBetAmount(String(qb))} disabled={currentBet > 0}
              className="flex-1 h-8 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-accent disabled:opacity-50 transition-colors">
              ₹{qb}
            </button>
          ))}
        </div>
      </div>

      {/* Detailed History */}
      {history.length > 0 && (
        <div className="surface-card rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-border flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">Your Rounds</span>
          </div>
          <div className="divide-y divide-border max-h-48 overflow-y-auto">
            {history.map((h, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={cn("font-mono-num font-bold", h.crashed && h.bet > 0 ? "text-destructive" : !h.crashed ? "text-success" : "text-muted-foreground")}>
                    {h.multiplier.toFixed(2)}x
                  </span>
                  <span className="text-muted-foreground">{h.crashed ? (h.bet > 0 ? "Lost" : "Crashed") : "Cashed Out"}</span>
                </div>
                <div className="text-right">
                  {h.bet > 0 && <span className="text-muted-foreground">Bet: ₹{h.bet.toFixed(0)}</span>}
                  {h.won > 0 && <span className="ml-2 text-success font-medium">+₹{h.won.toFixed(0)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AviatorPage;
