import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import doodleJumpLogo from "@/assets/doodle-jump-logo.jpg";

const DoodleJumpPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("dj_hs") || 0));
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const gameRef = useRef<any>(null);
  const animRef = useRef<number>(0);

  const CANVAS_W = 400;
  const CANVAS_H = 600;
  const PLAYER_W = 40;
  const PLAYER_H = 40;
  const PLATFORM_W = 70;
  const PLATFORM_H = 12;
  const GRAVITY = 0.4;
  const JUMP_VEL = -12;
  const PLATFORM_COUNT = 8;

  type Platform = { x: number; y: number; w: number; type: "normal" | "moving" | "breakable"; dx: number; broken: boolean };

  const createPlatforms = useCallback((startY: number): Platform[] => {
    const platforms: Platform[] = [];
    for (let i = 0; i < PLATFORM_COUNT; i++) {
      const y = startY - i * (CANVAS_H / PLATFORM_COUNT);
      const r = Math.random();
      let type: Platform["type"] = "normal";
      if (r > 0.85) type = "breakable";
      else if (r > 0.7) type = "moving";
      platforms.push({
        x: Math.random() * (CANVAS_W - PLATFORM_W),
        y,
        w: PLATFORM_W,
        type,
        dx: type === "moving" ? (Math.random() > 0.5 ? 1.5 : -1.5) : 0,
        broken: false,
      });
    }
    return platforms;
  }, []);

  const startGame = useCallback(() => {
    const platforms = createPlatforms(CANVAS_H - 30);
    // Ensure first platform is under player
    platforms[0] = { x: CANVAS_W / 2 - PLATFORM_W / 2, y: CANVAS_H - 50, w: PLATFORM_W, type: "normal", dx: 0, broken: false };

    gameRef.current = {
      player: { x: CANVAS_W / 2 - PLAYER_W / 2, y: CANVAS_H - 90, vy: JUMP_VEL, vx: 0 },
      platforms,
      score: 0,
      maxHeight: 0,
      tiltX: 0,
      keys: { left: false, right: false },
    };
    setScore(0);
    setGameOver(false);
    setStarted(true);
  }, [createPlatforms]);

  // Input handling
  useEffect(() => {
    if (!started || gameOver) return;
    const g = gameRef.current;
    if (!g) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") g.keys.left = true;
      if (e.key === "ArrowRight" || e.key === "d") g.keys.right = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") g.keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d") g.keys.right = false;
    };

    let lastAlpha: number | null = null;
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null) {
        g.tiltX = e.gamma / 10;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      const x = e.touches[0].clientX;
      const w = window.innerWidth;
      if (x < w / 2) g.keys.left = true;
      else g.keys.right = true;
    };
    const onTouchEnd = () => {
      g.keys.left = false;
      g.keys.right = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("deviceorientation", onOrientation);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("deviceorientation", onOrientation);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [started, gameOver]);

  // Game loop
  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      const g = gameRef.current;
      if (!g) return;

      // Player movement
      let moveX = g.tiltX;
      if (g.keys.left) moveX -= 5;
      if (g.keys.right) moveX += 5;
      g.player.x += moveX;
      g.player.vy += GRAVITY;
      g.player.y += g.player.vy;

      // Wrap horizontally
      if (g.player.x > CANVAS_W) g.player.x = -PLAYER_W;
      if (g.player.x + PLAYER_W < 0) g.player.x = CANVAS_W;

      // Move platforms
      g.platforms.forEach((p: Platform) => {
        if (p.type === "moving") {
          p.x += p.dx;
          if (p.x <= 0 || p.x + p.w >= CANVAS_W) p.dx *= -1;
        }
      });

      // Collision with platforms (only when falling)
      if (g.player.vy >= 0) {
        g.platforms.forEach((p: Platform) => {
          if (p.broken) return;
          const px = g.player.x + PLAYER_W / 2;
          const py = g.player.y + PLAYER_H;
          if (px > p.x && px < p.x + p.w && py >= p.y && py <= p.y + PLATFORM_H + g.player.vy) {
            if (p.type === "breakable") {
              p.broken = true;
              return;
            }
            g.player.vy = JUMP_VEL;
            g.player.y = p.y - PLAYER_H;
          }
        });
      }

      // Scroll up when player goes above middle
      if (g.player.y < CANVAS_H / 2) {
        const diff = CANVAS_H / 2 - g.player.y;
        g.player.y = CANVAS_H / 2;
        g.score += Math.floor(diff);
        g.platforms.forEach((p: Platform) => { p.y += diff; });

        // Remove platforms below screen, add new ones above
        g.platforms = g.platforms.filter((p: Platform) => p.y < CANVAS_H + 50);
        while (g.platforms.length < PLATFORM_COUNT) {
          const highestY = Math.min(...g.platforms.map((p: Platform) => p.y));
          const r = Math.random();
          let type: Platform["type"] = "normal";
          if (r > 0.85) type = "breakable";
          else if (r > 0.7) type = "moving";
          g.platforms.push({
            x: Math.random() * (CANVAS_W - PLATFORM_W),
            y: highestY - (60 + Math.random() * 60),
            w: PLATFORM_W,
            type,
            dx: type === "moving" ? (Math.random() > 0.5 ? 1.5 : -1.5) : 0,
            broken: false,
          });
        }
      }

      // Game over
      if (g.player.y > CANVAS_H) {
        setGameOver(true);
        setScore(g.score);
        const hs = Number(localStorage.getItem("dj_hs") || 0);
        if (g.score > hs) {
          localStorage.setItem("dj_hs", String(g.score));
          setHighScore(g.score);
          toast.success(`New high score: ${g.score}! 🎉`);
        }
        return;
      }

      setScore(g.score);

      // Draw
      const dpr = window.devicePixelRatio || 1;
      canvas.width = CANVAS_W * dpr;
      canvas.height = CANVAS_H * dpr;
      ctx.scale(dpr, dpr);

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bg.addColorStop(0, "#0f172a");
      bg.addColorStop(1, "#1e293b");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Platforms
      g.platforms.forEach((p: Platform) => {
        if (p.broken) return;
        ctx.fillStyle = p.type === "normal" ? "#22c55e" : p.type === "moving" ? "#3b82f6" : "#f59e0b";
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.w, PLATFORM_H, 4);
        ctx.fill();
        if (p.type === "breakable") {
          ctx.strokeStyle = "#92400e";
          ctx.lineWidth = 1;
          for (let i = 1; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(p.x + i * p.w / 3, p.y);
            ctx.lineTo(p.x + i * p.w / 3, p.y + PLATFORM_H);
            ctx.stroke();
          }
        }
      });

      // Player (doodler)
      const px = g.player.x;
      const py = g.player.y;
      // Body
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.ellipse(px + PLAYER_W / 2, py + PLAYER_H / 2, PLAYER_W / 2 - 2, PLAYER_H / 2 - 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(px + PLAYER_W / 2 - 7, py + PLAYER_H / 2 - 5, 3, 0, Math.PI * 2);
      ctx.arc(px + PLAYER_W / 2 + 7, py + PLAYER_H / 2 - 5, 3, 0, Math.PI * 2);
      ctx.fill();
      // Feet
      ctx.fillStyle = "#f97316";
      ctx.fillRect(px + 5, py + PLAYER_H - 6, 10, 6);
      ctx.fillRect(px + PLAYER_W - 15, py + PLAYER_H - 6, 10, 6);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [started, gameOver]);

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/games" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <img src={doodleJumpLogo} alt="Doodle Jump" className="h-10 w-10 rounded-xl object-cover" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">Doodle Jump</h1>
          <p className="text-[10px] text-muted-foreground">Practice Mode · Free</p>
        </div>
      </div>

      <div className="flex justify-between text-xs">
        <span>Score: <strong className="font-mono-num text-primary">{score}</strong></span>
        <span>Best: <strong className="font-mono-num text-warning">{highScore}</strong></span>
      </div>

      <div className="relative w-full rounded-xl overflow-hidden border border-border" style={{ touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
        />

        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <img src={doodleJumpLogo} alt="Doodle Jump" className="h-16 w-16 rounded-2xl object-cover mb-3" />
            <p className="text-lg font-bold mb-1">Doodle Jump</p>
            <p className="text-xs text-muted-foreground mb-3">Tap left/right or tilt to move</p>
            <button onClick={startGame} className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              Start Game
            </button>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <p className="text-lg font-bold text-destructive mb-1">Game Over!</p>
            <p className="text-sm text-muted-foreground mb-3">Score: {score}</p>
            <button onClick={startGame} className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2">
              <RotateCcw className="h-4 w-4" /> Play Again
            </button>
          </div>
        )}
      </div>

      <div className="text-[10px] text-muted-foreground text-center space-y-0.5">
        <p>🟢 Normal · 🔵 Moving · 🟡 Breakable</p>
        <p>Arrow keys / tilt to move · Tap left/right on mobile</p>
      </div>
    </div>
  );
};

export default DoodleJumpPage;
