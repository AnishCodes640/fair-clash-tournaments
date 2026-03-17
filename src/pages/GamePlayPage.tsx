import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { placeBet, addWinnings, getWalletBalance } from "@/lib/walletApi";
import { ArrowLeft, Wallet, EyeOff } from "lucide-react";
import { toast } from "sonner";

const GamePlayPage = () => {
  const { id } = useParams();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [bettingEnabled, setBettingEnabled] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const { data } = await supabase.from("games").select("*").eq("id", id).single();
      setGame(data);
      // Enable betting if game has min_bet or max_bet configured
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
    const { type, amount } = event.data;
    switch (type) {
      case "FC_GET_BALANCE": {
        const bal = await getWalletBalance(user.id);
        setBalance(bal);
        iframeRef.current?.contentWindow?.postMessage({ type: "FC_BALANCE_RESULT", balance: bal }, "*");
        break;
      }
      case "FC_PLACE_BET": {
        if (!bettingEnabled) { iframeRef.current?.contentWindow?.postMessage({ type: "FC_BET_RESULT", success: false, error: "Betting disabled" }, "*"); break; }
        const result = await placeBet(user.id, amount, game.title);
        setBalance(result.newBalance || balance);
        iframeRef.current?.contentWindow?.postMessage({ type: "FC_BET_RESULT", ...result }, "*");
        if (result.success) {
          toast.success(`Bet ₹${amount} placed`);
          await supabase.from("game_sessions").insert({ user_id: user.id, game_id: game.id, game_title: game.title, bet_amount: amount, result: "pending" });
        } else toast.error(result.error);
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
      case "FC_END_GAME": { navigate("/games"); break; }
    }
  }, [user, game, balance, navigate, refreshProfile, bettingEnabled]);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  if (loading) return <div className="flex items-center justify-center h-[60vh] text-sm text-muted-foreground">Loading game...</div>;
  if (!game) return <div className="flex items-center justify-center h-[60vh] text-sm text-muted-foreground">Game not found</div>;

  const gameUrl = game.game_file_url ? supabase.storage.from("game-files").getPublicUrl(game.game_file_url).data.publicUrl : null;
  if (!gameUrl) return <div className="flex items-center justify-center h-[60vh] text-sm text-muted-foreground">No game file available</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/games")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setBettingEnabled(!bettingEnabled)}
            className={`h-7 px-2 rounded-md text-[10px] font-medium flex items-center gap-1 ${bettingEnabled ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
            {bettingEnabled ? <Wallet className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {bettingEnabled ? "Betting ON" : "Practice"}
          </button>
          {bettingEnabled && (
            <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono-num text-sm font-semibold">₹{balance.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      <h1 className="text-lg font-bold">{game.title}</h1>

      <div className="rounded-xl overflow-hidden border border-border bg-card">
        <iframe ref={iframeRef} src={gameUrl} className="w-full aspect-[16/10] border-0" sandbox="allow-scripts allow-same-origin" title={game.title} />
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        {bettingEnabled ? "This game uses FairClash Wallet. Balance syncs in real-time." : "Practice mode — no real money is used."}
      </p>
    </div>
  );
};

export default GamePlayPage;
