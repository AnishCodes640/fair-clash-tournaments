import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { placeBet, addWinnings, getWalletBalance } from "@/lib/walletApi";
import {
  rollDice, getValidMoves, movePiece, createInitialState,
  PLAYER_COLORS, PLAYER_LABELS, getBoardPosition, getHomeStretchPosition, getYardPosition,
  type LudoState, type PiecePosition,
} from "@/lib/ludoEngine";
import { ArrowLeft, Wallet, Users, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Screen = "lobby" | "matchmaking" | "game" | "result";

const DICE_ICONS = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

const LudoPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("lobby");
  const [mode, setMode] = useState<"2p" | "4p">("2p");
  const [entryFee, setEntryFee] = useState(0);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [gameState, setGameState] = useState<LudoState>(createInitialState(2));
  const [myPlayerIndex, setMyPlayerIndex] = useState(0);
  const [diceRolled, setDiceRolled] = useState(false);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [validMoves, setValidMoves] = useState<number[]>([]);
  const [rolling, setRolling] = useState(false);
  const [balance, setBalance] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (user) getWalletBalance(user.id).then(setBalance);
  }, [user]);

  useEffect(() => {
    if (profile) setBalance(Number(profile.wallet_balance || 0));
  }, [profile]);

  // Subscribe to room changes
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`ludo-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ludo_rooms", filter: `id=eq.${roomId}` }, (payload: any) => {
        const room = payload.new;
        if (room?.status === "finished" && room.winner_id) {
          // Game ended
        }
        if (room?.board_state && Object.keys(room.board_state).length > 0) {
          const bs = room.board_state as any;
          if (bs.pieces) {
            setGameState(prev => ({
              ...prev,
              pieces: bs.pieces,
              currentTurn: room.current_turn,
              diceValue: room.dice_value,
              winner: bs.winner ?? null,
            }));
            setDiceRolled(false);
            setDiceValue(room.dice_value);
            setValidMoves([]);
          }
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ludo_players", filter: `room_id=eq.${roomId}` }, async () => {
        const { data } = await supabase.from("ludo_players").select("*").eq("room_id", roomId).order("player_index");
        if (data) setPlayers(data);
        // Check if game should start
        const maxPlayers = mode === "2p" ? 2 : 4;
        if (data && data.length >= maxPlayers) {
          const { data: room } = await supabase.from("ludo_rooms").select("status").eq("id", roomId).single();
          if (room?.status === "waiting") {
            await supabase.from("ludo_rooms").update({
              status: "playing",
              board_state: createInitialState(maxPlayers),
              current_turn: 0,
            }).eq("id", roomId);
            setScreen("game");
            setGameState(createInitialState(maxPlayers));
          }
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [roomId, mode]);

  const findOrCreateRoom = async () => {
    if (!user || !profile) { navigate("/auth"); return; }

    if (entryFee > 0 && balance < entryFee) {
      toast.error("Insufficient balance for entry fee");
      return;
    }

    setScreen("matchmaking");
    const maxPlayers = mode === "2p" ? 2 : 4;

    // Find existing waiting room
    const { data: rooms } = await supabase
      .from("ludo_rooms")
      .select("*, ludo_players(count)")
      .eq("mode", mode)
      .eq("status", "waiting")
      .eq("entry_fee", entryFee)
      .order("created_at", { ascending: true })
      .limit(5);

    let targetRoom: string | null = null;

    if (rooms && rooms.length > 0) {
      for (const room of rooms) {
        const playerCount = (room as any).ludo_players?.[0]?.count || 0;
        if (playerCount < maxPlayers) {
          // Check not already in this room
          const { data: existing } = await supabase.from("ludo_players")
            .select("id").eq("room_id", room.id).eq("user_id", user.id).single();
          if (!existing) {
            targetRoom = room.id;
            break;
          }
        }
      }
    }

    if (!targetRoom) {
      // Create new room
      const prizePool = entryFee * maxPlayers;
      const { data: newRoom } = await supabase.from("ludo_rooms").insert({
        mode, entry_fee: entryFee, prize_pool: prizePool,
        board_state: createInitialState(maxPlayers),
      }).select("id").single();
      if (!newRoom) { toast.error("Failed to create room"); setScreen("lobby"); return; }
      targetRoom = newRoom.id;
    }

    // Deduct entry fee
    if (entryFee > 0) {
      const betResult = await placeBet(user.id, entryFee, "Ludo");
      if (!betResult.success) { toast.error(betResult.error || "Failed to deduct entry fee"); setScreen("lobby"); return; }
      setBalance(betResult.newBalance || 0);
    }

    // Join room
    const { data: existingPlayers } = await supabase.from("ludo_players")
      .select("player_index").eq("room_id", targetRoom).order("player_index");
    const takenIndices = (existingPlayers || []).map((p: any) => p.player_index);
    let myIndex = 0;
    while (takenIndices.includes(myIndex)) myIndex++;

    await supabase.from("ludo_players").insert({
      room_id: targetRoom, user_id: user.id, player_index: myIndex,
      username: profile.display_name || profile.username,
      avatar_url: profile.avatar_url,
    });

    setRoomId(targetRoom);
    setMyPlayerIndex(myIndex);

    // Load current players
    const { data: allPlayers } = await supabase.from("ludo_players")
      .select("*").eq("room_id", targetRoom).order("player_index");
    setPlayers(allPlayers || []);

    const { data: roomData } = await supabase.from("ludo_rooms").select("status").eq("id", targetRoom).single();
    if (roomData?.status === "playing") {
      setScreen("game");
    }
  };

  const handleRollDice = async () => {
    if (!roomId || rolling || diceRolled) return;
    if (gameState.currentTurn !== myPlayerIndex) return;

    setRolling(true);
    const dice = rollDice();

    // Animate dice
    await new Promise(r => setTimeout(r, 600));
    setDiceValue(dice);
    setRolling(false);
    setDiceRolled(true);

    const moves = getValidMoves(gameState, myPlayerIndex, dice);
    if (moves.length === 0) {
      toast("No valid moves! Turn passes.", { icon: "⏭️" });
      // Pass turn
      const nextTurn = (myPlayerIndex + 1) % gameState.pieces.length;
      await supabase.from("ludo_rooms").update({
        current_turn: nextTurn,
        dice_value: dice,
        board_state: { ...gameState, currentTurn: nextTurn, diceValue: dice },
      }).eq("id", roomId);
      setDiceRolled(false);
      return;
    }
    setValidMoves(moves);
  };

  const handleMovePiece = async (pieceIndex: number) => {
    if (!roomId || !diceRolled || diceValue === null) return;
    if (!validMoves.includes(pieceIndex)) return;

    const result = movePiece(gameState, myPlayerIndex, pieceIndex, diceValue);

    if (result.killed) {
      toast("Piece captured! 💀", { icon: "⚔️" });
    }

    // Update room state
    const newBoardState = {
      pieces: result.newState.pieces,
      winner: result.newState.winner,
    };

    await supabase.from("ludo_rooms").update({
      current_turn: result.newState.currentTurn,
      dice_value: diceValue,
      board_state: newBoardState,
      ...(result.newState.winner !== null ? {
        status: "finished",
        winner_id: players[result.newState.winner]?.user_id,
      } : {}),
    }).eq("id", roomId);

    setGameState(result.newState);
    setDiceRolled(false);
    setValidMoves([]);

    // Handle win
    if (result.newState.winner !== null) {
      const winnerPlayer = players[result.newState.winner];
      if (winnerPlayer?.user_id === user?.id && entryFee > 0) {
        const prizePool = entryFee * players.length;
        const winResult = await addWinnings(user!.id, prizePool, "Ludo");
        if (winResult.success) setBalance(winResult.newBalance || 0);
        toast.success(`You won ₹${prizePool}! 🏆`);
      }
      setWinner(winnerPlayer?.username || "Unknown");
      setScreen("result");
    }

    if (result.extraTurn && result.newState.winner === null) {
      toast("Extra turn! 🎲", { icon: "🔄" });
      setDiceRolled(false);
    }
  };

  const isMyTurn = gameState.currentTurn === myPlayerIndex;
  const maxPlayers = mode === "2p" ? 2 : 4;

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center animate-fade-in">
        <h2 className="text-lg font-bold mb-2">Ludo Multiplayer</h2>
        <p className="text-sm text-muted-foreground mb-4">Sign in to play</p>
        <button onClick={() => navigate("/auth")} className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Sign In</button>
      </div>
    );
  }

  // LOBBY
  if (screen === "lobby") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/games")} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></button>
          <h1 className="text-xl font-bold">Ludo Multiplayer</h1>
        </div>

        <div className="surface-card rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold">Select Mode</h2>
          <div className="grid grid-cols-2 gap-3">
            {(["2p", "4p"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={cn("p-4 rounded-xl border-2 transition-all text-center",
                  mode === m ? "border-primary bg-primary/10" : "border-border hover:border-primary/30")}>
                <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-bold">{m === "2p" ? "2 Players" : "4 Players"}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{m === "2p" ? "Quick Match" : "Full Game"}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="surface-card rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold">Entry Fee</h2>
          <div className="flex gap-2 flex-wrap">
            {[0, 10, 25, 50, 100].map(fee => (
              <button key={fee} onClick={() => setEntryFee(fee)}
                className={cn("h-9 px-4 rounded-lg text-xs font-medium transition-all",
                  entryFee === fee ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}>
                {fee === 0 ? "Free" : `₹${fee}`}
              </button>
            ))}
          </div>
          {entryFee > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wallet className="h-3 w-3" />
              <span>Balance: ₹{balance.toFixed(0)}</span>
              <span>•</span>
              <span className="text-primary font-medium">Prize: ₹{entryFee * maxPlayers}</span>
            </div>
          )}
        </div>

        <button onClick={findOrCreateRoom}
          disabled={entryFee > 0 && balance < entryFee}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
          <Users className="h-4 w-4" /> Find Match
        </button>
      </div>
    );
  }

  // MATCHMAKING
  if (screen === "matchmaking") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-6 animate-fade-in">
        <Loader2 className="h-10 w-10 text-primary mx-auto animate-spin" />
        <h2 className="text-lg font-bold">Finding Players...</h2>
        <p className="text-sm text-muted-foreground">{players.length}/{maxPlayers} joined</p>

        <div className="flex justify-center gap-4">
          {Array.from({ length: maxPlayers }).map((_, i) => {
            const player = players.find((p: any) => p.player_index === i);
            return (
              <div key={i} className={cn("w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all",
                player ? "border-primary bg-primary/10" : "border-dashed border-border")}>
                {player ? (
                  <span className="text-xs font-bold text-center truncate px-1">{player.username?.slice(0, 6)}</span>
                ) : (
                  <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                )}
              </div>
            );
          })}
        </div>

        <button onClick={() => { setScreen("lobby"); setRoomId(null); }}
          className="text-xs text-muted-foreground hover:text-foreground underline">Cancel</button>
      </div>
    );
  }

  // RESULT
  if (screen === "result") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-6 animate-fade-in">
        <Trophy className="h-16 w-16 text-warning mx-auto" />
        <h2 className="text-2xl font-bold">{winner} Wins!</h2>
        {entryFee > 0 && <p className="text-primary font-bold text-lg">Prize: ₹{entryFee * players.length}</p>}
        <button onClick={() => { setScreen("lobby"); setRoomId(null); setPlayers([]); }}
          className="h-10 px-8 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          Play Again
        </button>
      </div>
    );
  }

  // GAME BOARD
  const cellSize = 100 / 15;
  const DiceIcon = diceValue ? DICE_ICONS[diceValue - 1] : Dice1;

  return (
    <div className="max-w-2xl mx-auto px-2 py-3 space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <button onClick={() => navigate("/games")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-sm font-bold">Ludo</h1>
        {entryFee > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <Wallet className="h-3 w-3 text-primary" />
            <span className="font-mono-num">₹{balance.toFixed(0)}</span>
          </div>
        )}
      </div>

      {/* Player indicators */}
      <div className="flex gap-2 px-2 overflow-x-auto no-scrollbar">
        {players.map((p: any) => (
          <div key={p.id} className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium border",
            gameState.currentTurn === p.player_index ? "border-primary bg-primary/10" : "border-border")}>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAYER_COLORS[p.player_index] }} />
            <span className="truncate max-w-[60px]">{p.username}</span>
            {p.user_id === user?.id && <span className="text-primary">(you)</span>}
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="relative w-full aspect-square max-w-[400px] mx-auto bg-card rounded-xl border border-border overflow-hidden">
        {/* Grid background */}
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Board background */}
          <rect x="0" y="0" width="100" height="100" fill="hsl(var(--card))" />

          {/* Player home areas */}
          <rect x="0" y="60" width="40" height="40" rx="2" fill={PLAYER_COLORS[0] + "15"} stroke={PLAYER_COLORS[0] + "30"} strokeWidth="0.3" />
          <rect x="0" y="0" width="40" height="40" rx="2" fill={PLAYER_COLORS[1] + "15"} stroke={PLAYER_COLORS[1] + "30"} strokeWidth="0.3" />
          <rect x="60" y="0" width="40" height="40" rx="2" fill={PLAYER_COLORS[2] + "15"} stroke={PLAYER_COLORS[2] + "30"} strokeWidth="0.3" />
          <rect x="60" y="60" width="40" height="40" rx="2" fill={PLAYER_COLORS[3] + "15"} stroke={PLAYER_COLORS[3] + "30"} strokeWidth="0.3" />

          {/* Center home */}
          <polygon points="43.3,43.3 50,35 56.7,43.3" fill={PLAYER_COLORS[2] + "40"} />
          <polygon points="43.3,56.7 50,65 56.7,56.7" fill={PLAYER_COLORS[0] + "40"} />
          <polygon points="43.3,43.3 35,50 43.3,56.7" fill={PLAYER_COLORS[1] + "40"} />
          <polygon points="56.7,43.3 65,50 56.7,56.7" fill={PLAYER_COLORS[3] + "40"} />

          {/* Render pieces */}
          {gameState.pieces.map((playerPieces, pIdx) => (
            playerPieces.map((pos, pieceIdx) => {
              let coord: { x: number; y: number };
              if (pos === -1) {
                coord = getYardPosition(pIdx, pieceIdx);
              } else if (pos === 200) {
                // Finished — show in center
                coord = { x: 6.5 + pieceIdx * 0.7, y: 7 };
              } else if (pos >= 100) {
                coord = getHomeStretchPosition(pIdx, pos);
              } else {
                coord = getBoardPosition(pos);
              }

              const cx = coord.x * cellSize + cellSize / 2;
              const cy = coord.y * cellSize + cellSize / 2;
              const isClickable = isMyTurn && diceRolled && validMoves.includes(pieceIdx) && pIdx === myPlayerIndex;

              return (
                <g key={`${pIdx}-${pieceIdx}`}>
                  {isClickable && (
                    <circle cx={cx} cy={cy} r={cellSize * 0.55} fill={PLAYER_COLORS[pIdx] + "30"} className="animate-pulse" />
                  )}
                  <circle
                    cx={cx} cy={cy} r={cellSize * 0.35}
                    fill={PLAYER_COLORS[pIdx]}
                    stroke="white" strokeWidth="0.4"
                    className={cn("transition-all duration-300", isClickable && "cursor-pointer")}
                    style={{ filter: pos === 200 ? "brightness(1.3)" : undefined }}
                    onClick={() => isClickable && handleMovePiece(pieceIdx)}
                  />
                  <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                    fill="white" fontSize="2.5" fontWeight="bold">
                    {pieceIdx + 1}
                  </text>
                </g>
              );
            })
          ))}
        </svg>
      </div>

      {/* Controls */}
      <div className="surface-card rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: PLAYER_COLORS[gameState.currentTurn] }} />
            <span className="text-xs font-medium">
              {isMyTurn ? "Your Turn!" : `${players[gameState.currentTurn]?.username || PLAYER_LABELS[gameState.currentTurn]}'s turn`}
            </span>
          </div>
          {diceValue && (
            <div className="flex items-center gap-1">
              <DiceIcon className="h-8 w-8 text-primary" />
            </div>
          )}
        </div>

        {isMyTurn && !diceRolled && (
          <button onClick={handleRollDice} disabled={rolling}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
            {rolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dice1 className="h-5 w-5" />}
            {rolling ? "Rolling..." : "Roll Dice"}
          </button>
        )}

        {isMyTurn && diceRolled && validMoves.length > 0 && (
          <p className="text-xs text-center text-primary font-medium animate-pulse">Tap a highlighted piece to move</p>
        )}
      </div>
    </div>
  );
};

export default LudoPage;
