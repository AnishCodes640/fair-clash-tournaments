import { supabase } from "@/integrations/supabase/client";

export interface BetResult {
  success: boolean;
  newBalance?: number;
  error?: string;
  transactionId?: string;
  sessionId?: string;
}

export async function getWalletBalance(userId: string): Promise<number> {
  const { data } = await supabase
    .from("profiles")
    .select("wallet_balance")
    .eq("user_id", userId)
    .single();
  return Number(data?.wallet_balance || 0);
}

export async function placeBet(userId: string, amount: number, gameTitle: string, gameId?: string): Promise<BetResult> {
  const { data, error } = await supabase.rpc("place_bet", {
    p_amount: amount,
    p_game_id: gameId || gameTitle.toLowerCase().replace(/\s+/g, "_"),
    p_game_title: gameTitle,
  });

  if (error) return { success: false, error: error.message };

  const result = data as any;
  if (!result?.success) return { success: false, error: result?.error || "Bet failed" };

  return {
    success: true,
    newBalance: result.newBalance,
    transactionId: result.transactionId,
    sessionId: result.sessionId,
  };
}

export async function addWinnings(userId: string, amount: number, gameTitle: string, sessionId?: string): Promise<BetResult> {
  const { data, error } = await supabase.rpc("add_winnings", {
    p_amount: amount,
    p_game_title: gameTitle,
    p_session_id: sessionId || null,
  });

  if (error) return { success: false, error: error.message };

  const result = data as any;
  if (!result?.success) return { success: false, error: result?.error || "Failed" };

  return {
    success: true,
    newBalance: result.newBalance,
    transactionId: result.transactionId,
  };
}

export async function recordLoss(sessionId: string): Promise<{ success: boolean }> {
  const { data, error } = await supabase.rpc("record_loss", {
    p_session_id: sessionId,
  });
  if (error) return { success: false };
  return { success: (data as any)?.success ?? false };
}

export async function refundBet(userId: string, amount: number, reason: string): Promise<BetResult> {
  const { data, error } = await supabase.rpc("refund_bet", {
    p_amount: amount,
    p_reason: reason,
  });

  if (error) return { success: false, error: error.message };

  const result = data as any;
  if (!result?.success) return { success: false, error: result?.error || "Refund failed" };

  return { success: true, newBalance: result.newBalance };
}

/**
 * Game adapter bridge - generates a JS snippet that HTML games can use
 * to interact with the platform wallet via postMessage.
 */
export function getGameBridgeScript(userId: string, sessionToken: string): string {
  return `
    window.FairClashWallet = {
      userId: "${userId}",
      getBalance: function() {
        return new Promise(function(resolve) {
          window.parent.postMessage({ type: "FC_GET_BALANCE" }, "*");
          window.addEventListener("message", function handler(e) {
            if (e.data.type === "FC_BALANCE_RESULT") {
              window.removeEventListener("message", handler);
              resolve(e.data.balance);
            }
          });
        });
      },
      placeBet: function(amount) {
        return new Promise(function(resolve) {
          window.parent.postMessage({ type: "FC_PLACE_BET", amount: amount }, "*");
          window.addEventListener("message", function handler(e) {
            if (e.data.type === "FC_BET_RESULT") {
              window.removeEventListener("message", handler);
              resolve(e.data);
            }
          });
        });
      },
      addWinnings: function(amount) {
        return new Promise(function(resolve) {
          window.parent.postMessage({ type: "FC_ADD_WINNINGS", amount: amount }, "*");
          window.addEventListener("message", function handler(e) {
            if (e.data.type === "FC_WINNINGS_RESULT") {
              window.removeEventListener("message", handler);
              resolve(e.data);
            }
          });
        });
      },
      endGame: function() {
        window.parent.postMessage({ type: "FC_END_GAME" }, "*");
      }
    };
  `;
}
