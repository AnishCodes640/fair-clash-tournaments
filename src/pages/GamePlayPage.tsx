import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { placeBet, addWinnings, getWalletBalance } from "@/lib/walletApi";
import { ArrowLeft, Wallet, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

const GamePlayPage = () => {
  const { id } = useParams();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [bettingEnabled, setBettingEnabled] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const { data } = await supabase.from("games").select("*").eq("id", id).single();
      setGame(data);
      setBettingEnabled(!!(data?.min_bet || data?.max_bet));
      setLoading(false);
    };
    load();
  }, [id]);

  useEffect(() => {
    if (user) getWalletBalance(user.id).then(setBalance);
  }, [user]);

  const handleMessage = useCallback(async (event: MessageEvent) => {
    if (!user || !game) return;
    const { type, amount } = event.data || {};
    if (!type || typeof type !== "string" || !type.startsWith("FC_")) return;

    switch (type) {
      case "FC_GET_BALANCE": {
        const bal = await getWalletBalance(user.id);
        setBalance(bal);
        iframeRef.current?.contentWindow?.postMessage({ type: "FC_BALANCE_RESULT", balance: bal }, "*");
        break;
      }
      case "FC_PLACE_BET": {
        if (!bettingEnabled) {
          iframeRef.current?.contentWindow?.postMessage({ type: "FC_BET_RESULT", success: false, error: "Betting disabled" }, "*");
          break;
        }
        const result = await placeBet(user.id, amount, game.title);
        setBalance(result.newBalance || balance);
        iframeRef.current?.contentWindow?.postMessage({ type: "FC_BET_RESULT", ...result }, "*");
        if (result.success) {
          toast.success(`Bet ₹${amount} placed`);
          await supabase.from("game_sessions").insert({ user_id: user.id, game_id: game.id, game_title: game.title, bet_amount: amount, result: "pending" });
        } else {
          toast.error(result.error);
        }
        break;
      }
      case "FC_ADD_WINNINGS": {
        const result = await addWinnings(user.id, amount, game.title);
        setBalance(result.newBalance || balance);
        iframeRef.current?.contentWindow?.postMessage({ type: "FC_WINNINGS_RESULT", ...result }, "*");
        if (result.success) {
          toast.success(`Won ₹${amount}!`);
          await supabase.from("game_sessions").insert({ user_id: user.id, game_id: game.id, game_title: game.title, win_amount: amount, result: "win" });
          await refreshProfile();
        }
        break;
      }
      case "FC_END_GAME":
        navigate("/games");
        break;
    }
  }, [user, game, balance, navigate, refreshProfile, bettingEnabled]);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  if (loading) return <div className="flex items-center justify-center h-[80vh] text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading game...</div>;
  if (!game) return <div className="flex items-center justify-center h-[80vh] text-sm text-muted-foreground">Game not found</div>;

  const gameUrl = game.game_file_url
    ? supabase.storage.from("game-files").getPublicUrl(game.game_file_url).data.publicUrl + `?t=${Date.now()}`
    : null;

  if (!gameUrl) return <div className="flex items-center justify-center h-[80vh] text-sm text-muted-foreground">No game file available</div>;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border flex-shrink-0">
        <button onClick={() => navigate("/games")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-sm font-bold truncate max-w-[180px]">{game.title}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setBettingEnabled(!bettingEnabled)}
            className={`h-7 px-2 rounded-md text-[10px] font-medium flex items-center gap-1 transition-colors ${bettingEnabled ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
            {bettingEnabled ? <Wallet className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {bettingEnabled ? "Betting" : "Practice"}
          </button>
          {bettingEnabled && (
            <div className="flex items-center gap-1 bg-secondary rounded-lg px-2 py-1">
              <Wallet className="h-3 w-3 text-primary" />
              <span className="font-mono-num text-xs font-semibold">₹{balance.toFixed(0)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Game iframe - full screen */}
      <div className="flex-1 relative">
        {iframeLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 text-primary mx-auto animate-spin" />
              <p className="text-sm text-muted-foreground">Loading game...</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={gameUrl}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          allow="autoplay; fullscreen"
          title={game.title}
          onLoad={() => setIframeLoading(false)}
          onError={() => { setIframeLoading(false); toast.error("Failed to load game"); }}
        />
      </div>

      {/* Footer info */}
      <div className="px-4 py-1.5 bg-card border-t border-border flex-shrink-0">
        <p className="text-[10px] text-muted-foreground text-center">
          {bettingEnabled ? "Wallet syncs in real-time • FairClash Tournaments" : "Practice mode — no real money used"}
        </p>
      </div>
    </div>
  );
};

export default GamePlayPage;
