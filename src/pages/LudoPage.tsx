import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { placeBet, addWinnings, getWalletBalance } from "@/lib/walletApi";
import {
  rollDice, getValidMoves, movePiece, createInitialState,
  PLAYER_COLORS, PLAYER_LABELS,
  type LudoState,
} from "@/lib/ludoEngine";
import { ArrowLeft, Wallet, Users, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ludoClashLogo from "@/assets/ludo-clash-logo.jpg";
import ludoBoard from "@/assets/ludo-board.jpg";
import { playSound as playSfx } from "@/lib/soundManager";

type Screen = "lobby" | "matchmaking" | "game" | "result";

const DICE_ICONS = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

// Sound effects handled by soundManager

// Board rendering helpers — maps piece state to SVG coordinates on a 15x15 grid
// Based on standard Ludo board layout (reference image: green top-left, yellow top-right, blue bottom-right, red bottom-left)
const CELL = 100 / 15;

// Main path coordinates (52 cells around the board)
const MAIN_PATH: [number, number][] = [
  // Red start (bottom): pos 0-5 going up column 6
  [6,13],[6,12],[6,11],[6,10],[6,9],[6,8],
  // Turn left: pos 6
  [5,8],
  // Left arm: pos 7-11 going left row 8, then up
  [4,8],[3,8],[2,8],[1,8],[0,8],
  // Corner turn: pos 12
  [0,7],
  // Left top: pos 13-17 going right row 6
  [0,6],[1,6],[2,6],[3,6],[4,6],
  // Turn up: pos 18
  [5,6],
  // Top arm: pos 19-23 going up column 6
  [6,5],[6,4],[6,3],[6,2],[6,1],
  // Corner: pos 24
  [6,0],
  // Top right: pos 25
  [7,0],
  // Turn: pos 26-30 going down
  [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],
  // Turn right: pos 32
  [9,6],
  // Right arm: pos 33-37
  [10,6],[11,6],[12,6],[13,6],[14,6],
  // Corner: pos 38
  [14,7],
  // Right bottom: pos 39-43
  [14,8],[13,8],[12,8],[11,8],[10,8],
  // Turn down: pos 44
  [9,8],
  // Bottom arm: pos 45-49
  [8,9],[8,10],[8,11],[8,12],[8,13],
  // Corner: pos 50
  [8,14],
  // Back to start: pos 51
  [7,14],
];

// Home stretch positions for each player (6 cells leading to center)
const HOME_STRETCHES: Record<number, [number, number][]> = {
  0: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]], // Red: bottom center going up
  1: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],     // Green: left center going right
  2: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],     // Yellow: top center going down
  3: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]], // Blue: right center going left
};

// Yard positions (home base for each player)
const YARDS: Record<number, [number, number][]> = {
  0: [[2,11],[4,11],[2,13],[4,13]],   // Red: bottom-left
  1: [[2,1],[4,1],[2,3],[4,3]],       // Green: top-left
  2: [[10,1],[12,1],[10,3],[12,3]],   // Yellow: top-right
  3: [[10,11],[12,11],[10,13],[12,13]],// Blue: bottom-right
};

function getPieceXY(playerIdx: number, pos: number, pieceIdx: number): [number, number] {
  if (pos === -1) {
    const [gx, gy] = YARDS[playerIdx]?.[pieceIdx] || [7, 7];
    return [gx * CELL + CELL / 2, gy * CELL + CELL / 2];
  }
  if (pos === 200) {
    // Finished — cluster near center
    const offsets = [[6.8, 6.8], [7.2, 6.8], [6.8, 7.2], [7.2, 7.2]];
    const [ox, oy] = offsets[pieceIdx] || [7, 7];
    return [ox * CELL + CELL / 2, oy * CELL + CELL / 2];
  }
  if (pos >= 100) {
    const stretchIdx = pos - 100;
    const coords = HOME_STRETCHES[playerIdx]?.[stretchIdx];
    if (coords) return [coords[0] * CELL + CELL / 2, coords[1] * CELL + CELL / 2];
    return [50, 50];
  }
  // Main board
  const coords = MAIN_PATH[pos % 52];
  if (coords) return [coords[0] * CELL + CELL / 2, coords[1] * CELL + CELL / 2];
  return [50, 50];
}

const LudoPage = () => {
  const { user, profile, refreshProfile } = useAuth();
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

  // Cleanup stale sessions on mount
  useEffect(() => {
    if (!user) return;
    const cleanup = async () => {
      const { data: staleEntries } = await supabase
        .from("ludo_players").select("id, room_id").eq("user_id", user.id);
      if (staleEntries) {
        for (const entry of staleEntries) {
          const { data: room } = await supabase.from("ludo_rooms").select("status").eq("id", entry.room_id).single();
          if (room?.status === "waiting" || room?.status === "finished") {
            await supabase.from("ludo_players").delete().eq("id", entry.id);
          }
        }
      }
    };
    cleanup();
    return () => {
      // Also cleanup on unmount
      if (roomId && user) {
        supabase.from("ludo_players").delete().eq("room_id", roomId).eq("user_id", user.id);
      }
    };
  }, [user]);

  // Subscribe to room changes
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`ludo-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ludo_rooms", filter: `id=eq.${roomId}` }, (payload: any) => {
        const room = payload.new;
        if (room?.board_state && typeof room.board_state === "object") {
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
          if (room.status === "playing" && screen === "matchmaking") {
            setScreen("game");
          }
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ludo_players", filter: `room_id=eq.${roomId}` }, async () => {
        const { data } = await supabase.from("ludo_players").select("*").eq("room_id", roomId).order("player_index");
        if (data) setPlayers(data);
        const maxP = mode === "2p" ? 2 : 4;
        if (data && data.length >= maxP) {
          const { data: room } = await supabase.from("ludo_rooms").select("status").eq("id", roomId).single();
          if (room?.status === "waiting") {
            const initState = createInitialState(maxP);
            await supabase.from("ludo_rooms").update({
              status: "playing",
              board_state: JSON.parse(JSON.stringify(initState)),
              current_turn: 0,
            }).eq("id", roomId);
            setScreen("game");
            setGameState(initState);
          }
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [roomId, mode, screen]);

  const leaveRoom = useCallback(async () => {
    if (roomId && user) {
      await supabase.from("ludo_players").delete().eq("room_id", roomId).eq("user_id", user.id);
    }
    setRoomId(null); setPlayers([]); setScreen("lobby");
  }, [roomId, user]);

  const findOrCreateRoom = async () => {
    if (!user || !profile) { navigate("/auth"); return; }
    if (entryFee > 0 && balance < entryFee) { toast.error("Insufficient balance"); return; }

    setScreen("matchmaking");
    const maxP = mode === "2p" ? 2 : 4;

    // Clean up existing entries
    const { data: existing } = await supabase.from("ludo_players").select("id, room_id").eq("user_id", user.id);
    if (existing) {
      for (const entry of existing) {
        const { data: room } = await supabase.from("ludo_rooms").select("status").eq("id", entry.room_id).single();
        if (room?.status === "waiting" || room?.status === "finished") {
          await supabase.from("ludo_players").delete().eq("id", entry.id);
        }
      }
    }

    // Find waiting room with space
    const { data: rooms } = await supabase
      .from("ludo_rooms")
      .select("*, ludo_players(count)")
      .eq("mode", mode).eq("status", "waiting").eq("entry_fee", entryFee)
      .order("created_at", { ascending: true }).limit(10);

    let targetRoom: string | null = null;
    if (rooms) {
      for (const room of rooms) {
        const count = (room as any).ludo_players?.[0]?.count || 0;
        if (count < maxP) {
          // Verify user isn't already in this room
          const { data: alreadyIn } = await supabase.from("ludo_players")
            .select("id").eq("room_id", room.id).eq("user_id", user.id).single();
          if (!alreadyIn) { targetRoom = room.id; break; }
        }
      }
    }

    if (!targetRoom) {
      const { data: newRoom } = await supabase.from("ludo_rooms").insert([{
        mode, entry_fee: entryFee, prize_pool: entryFee * maxP,
        board_state: JSON.parse(JSON.stringify(createInitialState(maxP))),
      }]).select("id").single();
      if (!newRoom) { toast.error("Failed to create room"); setScreen("lobby"); return; }
      targetRoom = newRoom.id;
    }

    // Deduct entry fee
    if (entryFee > 0) {
      const betResult = await placeBet(user.id, entryFee, "Ludo Clash");
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

    const { data: allPlayers } = await supabase.from("ludo_players")
      .select("*").eq("room_id", targetRoom).order("player_index");
    setPlayers(allPlayers || []);

    const { data: roomData } = await supabase.from("ludo_rooms").select("status").eq("id", targetRoom).single();
    if (roomData?.status === "playing") setScreen("game");
  };

  const handleRollDice = async () => {
    if (!roomId || rolling || diceRolled) return;
    if (gameState.currentTurn !== myPlayerIndex) return;

    setRolling(true);
    playSfx("diceRoll");
    const dice = rollDice();

    await new Promise(r => setTimeout(r, 500));
    setDiceValue(dice);
    setRolling(false);
    setDiceRolled(true);
    playSfx("diceRoll");

    const moves = getValidMoves(gameState, myPlayerIndex, dice);
    if (moves.length === 0) {
      toast("No valid moves! Turn passes.", { icon: "⏭️" });
      const nextTurn = (myPlayerIndex + 1) % gameState.pieces.length;
      await supabase.from("ludo_rooms").update({
        current_turn: nextTurn, dice_value: dice,
        board_state: JSON.parse(JSON.stringify({ ...gameState, currentTurn: nextTurn, diceValue: dice })),
      }).eq("id", roomId);
      setDiceRolled(false);
      return;
    }
    setValidMoves(moves);
  };

  const handleMovePiece = async (pieceIndex: number) => {
    if (!roomId || !diceRolled || diceValue === null) return;
    if (!validMoves.includes(pieceIndex)) return;

    playSfx("tokenMove");
    const result = movePiece(gameState, myPlayerIndex, pieceIndex, diceValue);

    if (result.killed) {
      toast("Piece captured! 💀", { icon: "⚔️" });
      playSfx("kill");
    }

    const newBoardState = JSON.parse(JSON.stringify({
      pieces: result.newState.pieces,
      winner: result.newState.winner,
    }));

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

    if (result.newState.winner !== null) {
      const winnerPlayer = players[result.newState.winner];
      playSfx("win");
      if (winnerPlayer?.user_id === user?.id) {
        if (entryFee > 0) {
          const prizePool = entryFee * players.length;
          const winResult = await addWinnings(user!.id, prizePool, "Ludo Clash");
          if (winResult.success) setBalance(winResult.newBalance || 0);
          toast.success(`You won ₹${prizePool}! 🏆`);
        }
        await supabase.from("game_sessions").insert({
          user_id: user!.id, game_id: "ludo-clash", game_title: "Ludo Clash",
          bet_amount: entryFee, win_amount: entryFee * players.length, result: "win",
        });
        await refreshProfile();
      } else {
        if (user) {
          await supabase.from("game_sessions").insert({
            user_id: user.id, game_id: "ludo-clash", game_title: "Ludo Clash",
            bet_amount: entryFee, win_amount: 0, result: "loss",
          });
        }
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
        <img src={ludoClashLogo} alt="Ludo Clash" className="h-20 w-20 rounded-2xl object-cover mx-auto mb-4" />
        <h2 className="text-lg font-bold mb-2">Ludo Clash</h2>
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
          <img src={ludoClashLogo} alt="Ludo Clash" className="h-10 w-10 rounded-xl object-cover" />
          <div><h1 className="text-xl font-bold">Ludo Clash</h1><p className="text-[10px] text-muted-foreground">FairClash Tournaments</p></div>
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
              <Wallet className="h-3 w-3" /> Balance: ₹{balance.toFixed(0)} • <span className="text-primary font-medium">Prize: ₹{entryFee * maxPlayers}</span>
            </div>
          )}
        </div>

        <button onClick={findOrCreateRoom} disabled={entryFee > 0 && balance < entryFee}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
          <Users className="h-4 w-4" /> Find Match
        </button>
      </div>
    );
  }

  // MATCHMAKING with timeout
  const [matchTimer, setMatchTimer] = useState(0);
  const MATCH_TIMEOUT = 60;

  useEffect(() => {
    if (screen !== "matchmaking") { setMatchTimer(0); return; }
    const interval = setInterval(() => {
      setMatchTimer(prev => {
        if (prev + 1 >= MATCH_TIMEOUT) {
          clearInterval(interval);
          return MATCH_TIMEOUT;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [screen]);

  if (screen === "matchmaking") {
    const timedOut = matchTimer >= MATCH_TIMEOUT;
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-6 animate-fade-in">
        <img src={ludoClashLogo} alt="Ludo Clash" className="h-16 w-16 rounded-2xl object-cover mx-auto" />
        {timedOut ? (
          <>
            <Users className="h-10 w-10 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-bold">No Players Found</h2>
            <p className="text-sm text-muted-foreground">Players are not available right now. Please try again later.</p>
            <button onClick={leaveRoom} className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Back to Lobby</button>
          </>
        ) : (
          <>
            <Loader2 className="h-10 w-10 text-primary mx-auto animate-spin" />
            <h2 className="text-lg font-bold">Finding Players...</h2>
            <p className="text-sm text-muted-foreground">{players.length}/{maxPlayers} joined</p>
            <p className="text-xs text-muted-foreground">Estimated wait: ~{MATCH_TIMEOUT - matchTimer}s</p>
            <div className="flex justify-center gap-4">
              {Array.from({ length: maxPlayers }).map((_, i) => {
                const player = players.find((p: any) => p.player_index === i);
                return (
                  <div key={i} className={cn("w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all",
                    player ? "border-primary bg-primary/10" : "border-dashed border-border")}>
                    {player ? <span className="text-xs font-bold text-center truncate px-1">{player.username?.slice(0, 6)}</span>
                      : <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />}
                  </div>
                );
              })}
            </div>
            <button onClick={leaveRoom} className="text-xs text-destructive hover:text-foreground underline">Cancel & Leave</button>
          </>
        )}
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
          className="h-10 px-8 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Play Again</button>
      </div>
    );
  }

  // GAME BOARD
  const DiceIcon = diceValue ? DICE_ICONS[diceValue - 1] : Dice1;

  return (
    <div className="max-w-2xl mx-auto px-2 py-3 space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <button onClick={() => navigate("/games")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <img src={ludoClashLogo} alt="Ludo Clash" className="h-6 w-6 rounded-md object-cover" />
          <h1 className="text-sm font-bold">Ludo Clash</h1>
        </div>
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

      {/* SVG Ludo Board */}
      <div className="relative w-full aspect-square max-w-[400px] mx-auto rounded-xl overflow-hidden shadow-lg">
        {/* Board image background */}
        <img src={ludoBoard} alt="Ludo Board" className="absolute inset-0 w-full h-full object-cover" />
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          {/* Render pieces on top of board image */}
          {gameState.pieces.map((playerPieces, pIdx) =>
            playerPieces.map((pos, pieceIdx) => {
              const [cx, cy] = getPieceXY(pIdx, pos, pieceIdx);
              const isClickable = isMyTurn && diceRolled && validMoves.includes(pieceIdx) && pIdx === myPlayerIndex;

              return (
                <g key={`${pIdx}-${pieceIdx}`}>
                  {isClickable && (
                    <circle cx={cx} cy={cy} r={CELL * 0.55} fill={PLAYER_COLORS[pIdx] + "40"} className="animate-pulse" />
                  )}
                  <circle cx={cx} cy={cy} r={CELL * 0.38}
                    fill={PLAYER_COLORS[pIdx]} stroke="white" strokeWidth="0.6"
                    className={cn("transition-all duration-300", isClickable && "cursor-pointer")}
                    style={{ filter: pos === 200 ? "brightness(1.3) drop-shadow(0 0 2px gold)" : "drop-shadow(0 1px 1px rgba(0,0,0,0.3))" }}
                    onClick={() => isClickable && handleMovePiece(pieceIdx)} />
                  <text x={cx} y={cy + 0.8} textAnchor="middle" dominantBaseline="middle"
                    fill="white" fontSize="2.5" fontWeight="bold" style={{ pointerEvents: "none" }}>
                    {pieceIdx + 1}
                  </text>
                </g>
              );
            })
          )}
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
          {diceValue && <DiceIcon className="h-8 w-8 text-primary" />}
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
