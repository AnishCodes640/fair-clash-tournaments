import { Wallet, ArrowDownCircle, ArrowUpCircle, History } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Tab = "deposit" | "withdraw" | "history";

const WalletPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>("deposit");

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold tracking-tight">Wallet</h1>

      {/* Balance Card */}
      <div className="surface-card rounded-lg p-6">
        <p className="text-xs text-muted-foreground font-medium mb-1">Available Balance</p>
        <p className="font-mono-num text-3xl font-bold tracking-tight">₹0.00</p>
        <p className="text-xs text-muted-foreground mt-2">
          40% platform fee applies on withdrawals
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1">
        {[
          { id: "deposit" as Tab, label: "Deposit", icon: ArrowDownCircle },
          { id: "withdraw" as Tab, label: "Withdraw", icon: ArrowUpCircle },
          { id: "history" as Tab, label: "History", icon: History },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-colors duration-200",
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="surface-card rounded-lg p-8 flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Wallet className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-lg font-semibold mb-2">
          {activeTab === "deposit" && "Deposit Funds"}
          {activeTab === "withdraw" && "Withdraw Funds"}
          {activeTab === "history" && "Transaction History"}
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {activeTab === "deposit" && "Login to deposit funds via UPI payment."}
          {activeTab === "withdraw" && "Login to request a withdrawal."}
          {activeTab === "history" && "Login to view your transaction history."}
        </p>
      </div>
    </div>
  );
};

export default WalletPage;
