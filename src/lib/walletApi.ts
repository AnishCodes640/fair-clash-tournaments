import { supabase } from "@/integrations/supabase/client";

export interface BetResult {
  success: boolean;
  newBalance?: number;
  error?: string;
  transactionId?: string;
}

export async function getWalletBalance(userId: string): Promise<number> {
  const { data } = await supabase
    .from("profiles")
    .select("wallet_balance")
    .eq("user_id", userId)
    .single();
  return Number(data?.wallet_balance || 0);
}

export async function placeBet(userId: string, amount: number, gameTitle: string): Promise<BetResult> {
  const balance = await getWalletBalance(userId);
  if (amount <= 0) return { success: false, error: "Invalid bet amount" };
  if (amount > balance) return { success: false, error: "Insufficient balance" };

  const newBalance = balance - amount;
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ wallet_balance: newBalance })
    .eq("user_id", userId);
  if (updateError) return { success: false, error: updateError.message };

  const { data: tx, error: txError } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id: userId,
      type: "bet",
      amount,
      description: `Bet on ${gameTitle}`,
      status: "completed",
    })
    .select("id")
    .single();
  if (txError) return { success: false, error: txError.message };

  return { success: true, newBalance, transactionId: tx?.id };
}

export async function addWinnings(userId: string, amount: number, gameTitle: string): Promise<BetResult> {
  const balance = await getWalletBalance(userId);
  const newBalance = balance + amount;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ wallet_balance: newBalance })
    .eq("user_id", userId);
  if (updateError) return { success: false, error: updateError.message };

  const { data: tx } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id: userId,
      type: "winning",
      amount,
      description: `Won on ${gameTitle}`,
      status: "completed",
    })
    .select("id")
    .single();

  return { success: true, newBalance, transactionId: tx?.id };
}

export async function refundBet(userId: string, amount: number, reason: string): Promise<BetResult> {
  const balance = await getWalletBalance(userId);
  const newBalance = balance + amount;

  await supabase.from("profiles").update({ wallet_balance: newBalance }).eq("user_id", userId);
  await supabase.from("wallet_transactions").insert({
    user_id: userId,
    type: "refund",
    amount,
    description: reason,
    status: "completed",
  });

  return { success: true, newBalance };
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
