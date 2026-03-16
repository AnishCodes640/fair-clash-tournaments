import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { placeBet, addWinnings, getWalletBalance } from "@/lib/walletApi";
import { Plane, TrendingUp, History, Wallet, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import aviatorLogo from "@/assets/aviator-logo.jpg";

type GamePhase = "waiting" | "flying" | "crashed" | "cashed_out";

interface RoundHistory {
  multiplier: number;
  crashed: boolean;
  bet: number;
  won: number;
}

const CRASH_PROBABILITIES = [
  { max: 1.5, weight: 35 },
  { max: 2.0, weight: 25 },
  { max: 3.0, weight: 20 },
  { max: 5.0, weight: 10 },
  { max: 10.0, weight: 6 },
  { max: 25.0, weight: 3 },
  { max: 100.0, weight: 1 },
];

function generateCrashPoint(): number {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const tier of CRASH_PROBABILITIES) {
    cumulative += tier.weight;
    if (roll <= cumulative) {
      const prevMax = CRASH_PROBABILITIES[CRASH_PROBABILITIES.indexOf(tier) - 1]?.max || 1.0;
      return prevMax + Math.random() * (tier.max - prevMax);
    }
  }
  return 1.5;
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
  const [countdown, setCountdown] = useState(5);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const crashPointRef = useRef(0);

  useEffect(() => {
    if (user) {
      getWalletBalance(user.id).then(setBalance);
    }
  }, [user]);

  useEffect(() => {
    if (profile) setBalance(Number(profile.wallet_balance || 0));
  }, [profile]);

  // Canvas drawing
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
    const w = rect.width;
    const h = rect.height;

    // Background
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue("--bg") || "#0a0f1a";
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "rgba(100,150,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = h - (h * i) / 5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Curve
    const points: [number, number][] = [];
    const maxTime = Math.max(currentMult - 1, 0.5);
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * maxTime;
      const mult = 1 + t;
      if (mult > currentMult) break;
      const x = (i / steps) * w;
      const yNorm = (mult - 1) / Math.max(currentMult - 1, 1);
      const y = h - yNorm * h * 0.85 - h * 0.05;
      points.push([x, y]);
    }

    if (points.length > 1) {
      const gradient = ctx.createLinearGradient(0, h, 0, 0);
      if (crashed) {
        gradient.addColorStop(0, "rgba(255,50,50,0.0)");
        gradient.addColorStop(1, "rgba(255,50,50,0.3)");
      } else {
        gradient.addColorStop(0, "rgba(56,189,248,0.0)");
        gradient.addColorStop(1, "rgba(56,189,248,0.3)");
      }

      // Fill area under curve
      ctx.beginPath();
      ctx.moveTo(points[0][0], h);
      points.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(points[points.length - 1][0], h);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw curve line
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      points.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.strokeStyle = crashed ? "#ef4444" : "#38bdf8";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Plane icon at the tip
      const tip = points[points.length - 1];
      ctx.font = "24px serif";
      ctx.fillStyle = crashed ? "#ef4444" : "#38bdf8";
      ctx.fillText("✈", tip[0] - 12, tip[1] - 8);
    }

    // Multiplier text
    ctx.font = `bold ${crashed ? 48 : 56}px 'Inter', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = crashed ? "#ef4444" : "#38bdf8";
    ctx.fillText(`${currentMult.toFixed(2)}x`, w / 2, h / 2);

    if (crashed) {
      ctx.font = "bold 18px 'Inter', sans-serif";
      ctx.fillStyle = "#ef4444";
      ctx.fillText("CRASHED!", w / 2, h / 2 + 35);
    }
  }, []);

  // Start round
  const startRound = useCallback(() => {
    const cp = generateCrashPoint();
    crashPointRef.current = cp;
    setCrashPoint(cp);
    setPhase("flying");
    setMultiplier(1.0);
    startTimeRef.current = performance.now();

    const animate = (time: number) => {
      const elapsed = (time - startTimeRef.current) / 1000;
      const currentMult = Math.pow(Math.E, elapsed * 0.3);

      if (currentMult >= crashPointRef.current) {
        setMultiplier(crashPointRef.current);
        setPhase("crashed");
        drawGraph(crashPointRef.current, true);
        // If player didn't cash out, they lose
        return;
      }

      setMultiplier(currentMult);
      drawGraph(currentMult, false);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [drawGraph]);

  // Countdown and auto-start
  useEffect(() => {
    if (phase === "waiting") {
      drawGraph(1.0, false);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            startRound();
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase, startRound, drawGraph]);

  // Cleanup animation
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Auto restart after crash
  useEffect(() => {
    if (phase === "crashed") {
      if (currentBet > 0) {
        setHistory((prev) => [{ multiplier: crashPoint, crashed: true, bet: currentBet, won: 0 }, ...prev.slice(0, 19)]);
        setCurrentBet(0);
      }
      const timeout = setTimeout(() => {
        setPhase("waiting");
        setCountdown(5);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [phase, crashPoint, currentBet]);

  const handlePlaceBet = async () => {
    if (!user) { navigate("/auth"); return; }
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount < 10) {
      toast.error("Minimum bet is ₹10");
      return;
    }
    if (amount > balance) {
      toast.error("Insufficient balance");
      return;
    }

    const result = await placeBet(user.id, amount, "Aviator Crash");
    if (!result.success) {
      toast.error(result.error || "Bet failed");
      return;
    }
    setCurrentBet(amount);
    setBalance(result.newBalance || 0);
    toast.success(`Bet placed: ₹${amount}`);
  };

  const handleCashout = async () => {
    if (!user || currentBet <= 0 || phase !== "flying") return;

    const winAmount = currentBet * multiplier;
    const result = await addWinnings(user.id, winAmount, "Aviator Crash");
    if (!result.success) {
      toast.error("Cashout failed");
      return;
    }

    setBalance(result.newBalance || 0);
    setHistory((prev) => [{ multiplier, crashed: false, bet: currentBet, won: winAmount }, ...prev.slice(0, 19)]);
    setPhase("cashed_out");
    setCurrentBet(0);
    cancelAnimationFrame(animationRef.current);
    toast.success(`Cashed out at ${multiplier.toFixed(2)}x — Won ₹${winAmount.toFixed(2)}`);
    await refreshProfile();

    // Continue watching the round
    const continueAnim = (time: number) => {
      const elapsed = (time - startTimeRef.current) / 1000;
      const currentMult = Math.pow(Math.E, elapsed * 0.3);
      if (currentMult >= crashPointRef.current) {
        setMultiplier(crashPointRef.current);
        drawGraph(crashPointRef.current, true);
        setTimeout(() => { setPhase("waiting"); setCountdown(5); }, 3000);
        return;
      }
      setMultiplier(currentMult);
      drawGraph(currentMult, false);
      animationRef.current = requestAnimationFrame(continueAnim);
    };
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
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

      {/* Game Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-border bg-card">
        <canvas
          ref={canvasRef}
          className="w-full aspect-[16/9]"
          style={{ "--bg": "transparent" } as any}
        />

        {/* Countdown overlay */}
        {phase === "waiting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm">
            <Plane className="h-10 w-10 text-primary animate-bounce mb-3" />
            <p className="text-sm text-muted-foreground">Next round in</p>
            <p className="text-4xl font-bold text-primary font-mono-num">{countdown}s</p>
          </div>
        )}

        {/* Cashed out overlay */}
        {phase === "cashed_out" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-success/90 text-success-foreground px-4 py-2 rounded-lg text-sm font-bold glow-success">
            ✓ Cashed Out!
          </div>
        )}
      </div>

      {/* Round History Strip */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
        {history.slice(0, 10).map((h, i) => (
          <span
            key={i}
            className={cn(
              "px-2 py-1 rounded-md text-[10px] font-bold font-mono-num whitespace-nowrap flex-shrink-0",
              h.crashed ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
            )}
          >
            {h.multiplier.toFixed(2)}x
          </span>
        ))}
        {history.length === 0 && <span className="text-xs text-muted-foreground">No rounds played yet</span>}
      </div>

      {/* Betting Controls */}
      <div className="surface-card rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Bet Amount (₹)</label>
            <input
              type="number"
              min={10}
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Min ₹10"
              disabled={currentBet > 0}
              className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm font-mono-num focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>
          <div className="flex flex-col justify-end">
            {phase === "flying" && currentBet > 0 ? (
              <button
                onClick={handleCashout}
                className="h-10 px-6 rounded-lg bg-success text-success-foreground text-sm font-bold animate-pulse-glow whitespace-nowrap"
              >
                Cash Out ₹{(currentBet * multiplier).toFixed(0)}
              </button>
            ) : (
              <button
                onClick={handlePlaceBet}
                disabled={phase === "flying" || phase === "cashed_out" || currentBet > 0}
                className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 whitespace-nowrap"
              >
                {currentBet > 0 ? `Bet: ₹${currentBet}` : "Place Bet"}
              </button>
            )}
          </div>
        </div>

        {/* Quick bet buttons */}
        <div className="flex gap-2">
          {quickBets.map((qb) => (
            <button
              key={qb}
              onClick={() => setBetAmount(String(qb))}
              disabled={currentBet > 0}
              className="flex-1 h-8 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-accent disabled:opacity-50 transition-colors"
            >
              ₹{qb}
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="surface-card rounded-xl p-3 flex items-center gap-2 border-l-2 border-l-primary">
        <AlertCircle className="h-4 w-4 text-primary flex-shrink-0" />
        <p className="text-[10px] text-muted-foreground">Place your bet before takeoff. Cash out before the plane crashes to win! Min bet ₹10.</p>
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
                  <span className={cn("font-mono-num font-bold", h.crashed ? "text-destructive" : "text-success")}>
                    {h.multiplier.toFixed(2)}x
                  </span>
                  <span className="text-muted-foreground">{h.crashed ? "Crashed" : "Cashed Out"}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground">Bet: ₹{h.bet.toFixed(0)}</span>
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
