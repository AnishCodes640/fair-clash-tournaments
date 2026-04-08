import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { placeBet, addWinnings, getWalletBalance } from "@/lib/walletApi";
import { Plane, TrendingUp, History, Wallet, AlertCircle, Users, DollarSign, Timer, BookOpen, ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import aviatorLogo from "@/assets/aviator-logo.jpg";
import { playSound as playSfx, setSoundEnabled, isSoundEnabled } from "@/lib/soundManager";

type GamePhase = "waiting" | "flying" | "crashed" | "cashed_out";

interface RoundHistory { multiplier: number; crashed: boolean; bet: number; won: number; }

// Controlled probability-based multiplier — strict 8x cap
function generateCrashPoint(): number {
  const r = Math.random();
  if (r < 0.70) return 1.01 + Math.random() * 1.49; // 70% → 1.01x–2.5x
  if (r < 0.95) return 2.5 + Math.random() * 2.5;   // 25% → 2.5x–5.0x
  return 5.0 + Math.random() * 3.0;                  // 5%  → 5.0x–8.0x (max)
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
  const [soundOn, setSoundOn] = useState(true);
  const [fakePlayers, setFakePlayers] = useState(0);
  const [fakeTotalBets, setFakeTotalBets] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const crashPointRef = useRef(0);
  const phaseRef = useRef<GamePhase>("waiting");

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { setSoundEnabled(soundOn); }, [soundOn]);

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
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, "#1a0a0a"); bgGrad.addColorStop(1, "#2d0f0f");
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(239,68,68,0.06)"; ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) { const y = h - (h * i) / 6; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    const points: [number, number][] = [];
    const maxMult = Math.max(currentMult, 1.1);
    for (let i = 0; i <= 150; i++) {
      const frac = i / 150;
      const mult = 1 + (maxMult - 1) * Math.pow(frac, 1.5);
      if (mult > currentMult) break;
      points.push([frac * w * 0.88 + w * 0.06, h - ((mult - 1) / Math.max(maxMult - 1, 0.1)) * h * 0.78 - h * 0.1]);
    }

    if (points.length > 1) {
      const gradient = ctx.createLinearGradient(0, h, 0, 0);
      gradient.addColorStop(0, crashed ? "rgba(239,68,68,0.0)" : "rgba(251,146,60,0.0)");
      gradient.addColorStop(1, crashed ? "rgba(239,68,68,0.2)" : "rgba(251,146,60,0.15)");
      ctx.beginPath(); ctx.moveTo(points[0][0], h);
      points.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(points[points.length - 1][0], h); ctx.closePath();
      ctx.fillStyle = gradient; ctx.fill();

      ctx.shadowColor = crashed ? "#ef4444" : "#fb923c"; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i - 1][0] + points[i][0]) / 2;
        const yc = (points[i - 1][1] + points[i][1]) / 2;
        ctx.quadraticCurveTo(points[i - 1][0], points[i - 1][1], xc, yc);
      }
      ctx.strokeStyle = crashed ? "#ef4444" : "#fb923c"; ctx.lineWidth = 3; ctx.stroke();
      ctx.shadowBlur = 0;
      const tip = points[points.length - 1];
      ctx.font = "28px serif"; ctx.fillText(crashed ? "💥" : "✈️", tip[0] - 14, tip[1] + 8);
    }

    ctx.shadowColor = crashed ? "#ef4444" : "#fb923c"; ctx.shadowBlur = 20;
    ctx.font = `bold ${crashed ? 42 : 50}px 'Inter', sans-serif`;
    ctx.textAlign = "center"; ctx.fillStyle = crashed ? "#ef4444" : "#fb923c";
    ctx.fillText(`${currentMult.toFixed(2)}x`, w / 2, h * 0.45);
    ctx.shadowBlur = 0;
    if (crashed) { ctx.font = "bold 16px 'Inter', sans-serif"; ctx.fillStyle = "#ef4444"; ctx.fillText("CRASHED!", w / 2, h * 0.45 + 30); }
  }, []);

  // Slower growth rate for more suspense; strict cap at 8x
  const GROWTH_RATE = 0.06;

  const startRound = useCallback(() => {
    const cp = Math.min(generateCrashPoint(), 8.0); // Hard cap at 8x
    crashPointRef.current = cp; setCrashPoint(cp);
    setPhase("flying"); setMultiplier(1.0);
    startTimeRef.current = performance.now();
    playSfx("engine");

    const animate = (time: number) => {
      const elapsed = (time - startTimeRef.current) / 1000;
      const currentMult = Math.min(Math.exp(elapsed * GROWTH_RATE), 8.0);
      if (currentMult >= crashPointRef.current) {
        setMultiplier(crashPointRef.current); setPhase("crashed");
        drawGraph(crashPointRef.current, true);
        playSfx("crash");
        return;
      }
      setMultiplier(currentMult); drawGraph(currentMult, false);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
  }, [drawGraph]);

  useEffect(() => {
    if (phase === "waiting") {
      drawGraph(1.0, false); setCountdown(7);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(interval); startRound(); return 7; }
          if (prev <= 3) playSfx("countdown");
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase, startRound, drawGraph]);

  useEffect(() => { return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }; }, []);

  // Handle crash result — record loss
  useEffect(() => {
    if (phase === "crashed") {
      if (currentBet > 0) {
        setHistory((prev) => [{ multiplier: crashPoint, crashed: true, bet: currentBet, won: 0 }, ...prev.slice(0, 19)]);
        if (user) {
          supabase.from("game_sessions").insert({ user_id: user.id, game_id: "aviator", game_title: "Aviator Crash", bet_amount: currentBet, win_amount: 0, result: "loss" });
        }
        setCurrentBet(0);
        playSfx("lose");
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
    if (isNaN(amount) || amount < 1) { toast.error("Minimum bet is ₹1"); return; }
    if (amount > 30) { toast.error("Maximum bet is ₹30"); return; }
    if (amount > balance) { toast.error("Insufficient balance"); return; }

    const result = await placeBet(user.id, amount, "Aviator Crash");
    if (!result.success) { toast.error(result.error || "Bet failed"); return; }
    setCurrentBet(amount);
    setBalance(result.newBalance || 0);
    await refreshProfile();
    playSfx("bet");
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
    const betForSession = currentBet;
    setCurrentBet(0);
    playSfx("cashout");

    await supabase.from("game_sessions").insert({ user_id: user.id, game_id: "aviator", game_title: "Aviator Crash", bet_amount: betForSession, win_amount: winAmount, result: "win" });
    toast.success(`Cashed out at ${multiplier.toFixed(2)}x — Won ₹${winAmount.toFixed(2)}!`);
    await refreshProfile();

    const continueAnim = (time: number) => {
      const elapsed = (time - startTimeRef.current) / 1000;
      const currentMult = Math.min(Math.exp(elapsed * GROWTH_RATE), 8.0);
      if (currentMult >= crashPointRef.current) {
        setMultiplier(crashPointRef.current);
        drawGraph(crashPointRef.current, true);
        setTimeout(() => { setPhase("waiting"); }, 3500);
        return;
      }
      setMultiplier(currentMult); drawGraph(currentMult, false);
      animationRef.current = requestAnimationFrame(continueAnim);
    };
    cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(continueAnim);
  };

  const quickBets = [5, 10, 20, 25, 30];

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

  const canPlaceBet = (phase === "waiting" || phase === "flying") && currentBet === 0 && balance >= 1;
  const canCashout = phase === "flying" && currentBet > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/games" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
          <img src={aviatorLogo} alt="Aviator" className="h-10 w-10 rounded-xl object-cover" />
          <div><h1 className="text-lg font-bold tracking-tight">Aviator Crash</h1><p className="text-[10px] text-muted-foreground">Max 8.0x · FairClash</p></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSoundOn(!soundOn)} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono-num text-sm font-semibold">₹{balance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <button onClick={() => setShowRules(!showRules)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
        <BookOpen className="h-3 w-3" /> {showRules ? "Hide" : "Show"} Game Rules
      </button>

      {showRules && (
        <div className="surface-card rounded-xl p-4 space-y-2 text-xs text-muted-foreground border-l-2 border-l-destructive animate-fade-in">
          <p className="text-foreground font-medium text-sm">How to Play Aviator</p>
          <ul className="space-y-1 list-disc pl-4">
            <li>Place your bet (₹1–₹30) during countdown OR while the plane is flying</li>
            <li>The multiplier starts at 1.00x and increases gradually</li>
            <li>Hit <strong>CASH OUT</strong> before the plane crashes to win your bet × multiplier</li>
            <li>If you don't cash out before the crash, you lose your bet</li>
            <li>Most rounds crash between 1.2x–2.5x (70%). Max multiplier is 8.0x</li>
          </ul>
        </div>
      )}

      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {fakePlayers} playing</span>
        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> ₹{fakeTotalBets.toLocaleString()} pool</span>
        <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {history.length} rounds</span>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-destructive/30">
        <canvas ref={canvasRef} className="w-full aspect-[16/9]" />
        {phase === "waiting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a0a0a]/90 backdrop-blur-sm">
            <Plane className="h-10 w-10 text-destructive animate-bounce mb-3" />
            <p className="text-sm text-muted-foreground">Next round in</p>
            <p className="text-5xl font-bold text-destructive font-mono-num">{countdown}s</p>
            <p className="text-[10px] text-muted-foreground mt-2">Place your bet now!</p>
          </div>
        )}
        {phase === "cashed_out" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-success/90 text-success-foreground px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-success/30">
            ✓ Cashed Out!
          </div>
        )}
      </div>

      {/* CASHOUT BUTTON — prominent with glow */}
      {canCashout && (
        <button onClick={handleCashout}
          className="w-full h-16 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xl font-bold shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center gap-3 transition-all active:scale-95 animate-pulse border-2 border-emerald-400">
          💰 CASH OUT — ₹{(currentBet * multiplier).toFixed(0)}
        </button>
      )}

      {currentBet > 0 && phase === "flying" && (
        <div className="surface-card rounded-lg p-3 flex items-center justify-between border border-success/30">
          <div className="text-xs"><span className="text-muted-foreground">Active Bet:</span><span className="ml-1 font-bold font-mono-num text-foreground">₹{currentBet}</span></div>
          <div className="text-xs"><span className="text-muted-foreground">Potential Win:</span><span className="ml-1 font-bold font-mono-num text-success">₹{(currentBet * multiplier).toFixed(0)}</span></div>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
        {history.slice(0, 15).map((h, i) => (
          <span key={i} className={cn("px-2 py-1 rounded-md text-[10px] font-bold font-mono-num whitespace-nowrap flex-shrink-0",
            h.crashed && h.bet > 0 ? "bg-destructive/10 text-destructive" : !h.crashed ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
          )}>{h.multiplier.toFixed(2)}x</span>
        ))}
        {history.length === 0 && <span className="text-xs text-muted-foreground">No rounds played yet</span>}
      </div>

      {balance < 1 && (
        <div className="surface-card rounded-xl p-3 flex items-center gap-2 border-l-2 border-l-warning animate-fade-in">
          <AlertCircle className="h-4 w-4 text-warning flex-shrink-0" />
          <div className="flex-1"><p className="text-xs text-warning font-medium">Insufficient balance</p><p className="text-[10px] text-muted-foreground">Minimum ₹1 required to play</p></div>
          <Link to="/wallet" className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[10px] font-medium flex items-center">Deposit</Link>
        </div>
      )}

      <div className="surface-card rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Bet Amount (₹1–₹30)</label>
            <input type="number" min={1} max={30} value={betAmount} onChange={(e) => setBetAmount(e.target.value)} placeholder="Min ₹1"
              disabled={currentBet > 0}
              className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm font-mono-num focus:outline-none focus:ring-1 focus:ring-destructive disabled:opacity-50" />
          </div>
          <div className="flex flex-col justify-end">
            <button onClick={handlePlaceBet} disabled={!canPlaceBet}
              className="h-10 px-6 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold disabled:opacity-50 whitespace-nowrap shadow-lg shadow-destructive/20">
              {currentBet > 0 ? `Bet: ₹${currentBet}` : "Place Bet"}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          {quickBets.map((qb) => (
            <button key={qb} onClick={() => setBetAmount(String(qb))} disabled={currentBet > 0}
              className="flex-1 h-8 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 transition-colors">
              ₹{qb}
            </button>
          ))}
        </div>
      </div>

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
