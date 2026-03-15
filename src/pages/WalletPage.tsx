import { Wallet, ArrowDownCircle, ArrowUpCircle, History, Upload, Camera, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import upiQr from "@/assets/upi-qr.jpg";

type Tab = "deposit" | "withdraw" | "history";

const MIN_DEPOSIT = 50;
const MIN_WITHDRAWAL = 100;
const PLATFORM_FEE = 0.4;

const WalletPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>("deposit");
  const { user, profile } = useAuth();
  const [depositAmount, setDepositAmount] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadTransactions = async () => {
    if (!user) return;
    setLoadingTx(true);
    const { data } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setTransactions(data || []);
    setLoadingTx(false);
  };

  const compressImage = (file: File, maxSize: number, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > maxSize || h > maxSize) {
            const ratio = Math.min(maxSize / w, maxSize / h);
            w *= ratio;
            h *= ratio;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Compression failed"));
          }, "image/jpeg", quality);
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !screenshot || !depositAmount) return;

    const amount = parseFloat(depositAmount);
    if (amount < MIN_DEPOSIT) {
      toast.error(`Minimum deposit is ₹${MIN_DEPOSIT}`);
      return;
    }

    if (screenshot.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max 5MB allowed.");
      return;
    }

    setSubmitting(true);
    setUploadProgress(10);
    try {
      // Compress screenshot
      setUploadProgress(30);
      const compressed = await compressImage(screenshot, 1200, 0.7);
      
      setUploadProgress(50);
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("payment-screenshots")
        .upload(path, compressed);
      if (uploadError) throw uploadError;

      setUploadProgress(80);
      const { error } = await supabase.from("payment_requests").insert({
        user_id: user.id,
        amount,
        screenshot_url: path,
      });
      if (error) throw error;
      
      setUploadProgress(100);
      toast.success("Deposit request submitted! Admin will verify shortly.");
      setDepositAmount("");
      setScreenshot(null);
      setUploadProgress(0);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit deposit");
      setUploadProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !withdrawAmount) return;
    const amount = parseFloat(withdrawAmount);
    
    if (amount < MIN_WITHDRAWAL) {
      toast.error(`Minimum withdrawal is ₹${MIN_WITHDRAWAL}`);
      return;
    }
    
    const balance = profile?.wallet_balance || 0;
    if (amount > balance) {
      toast.error("Insufficient balance");
      return;
    }
    const fee = amount * PLATFORM_FEE;
    const net = amount - fee;
    toast.info(`You will receive ₹${net.toFixed(2)} after ₹${fee.toFixed(2)} platform fee. Withdrawal feature coming soon.`);
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
        <h1 className="text-xl font-bold tracking-tight">Wallet</h1>
        <div className="surface-card rounded-lg p-8 flex flex-col items-center justify-center text-center">
          <Wallet className="h-8 w-8 text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Please sign in to access your wallet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold tracking-tight">Wallet</h1>

      <div className="surface-card rounded-lg p-6">
        <p className="text-xs text-muted-foreground font-medium mb-1">Available Balance</p>
        <p className="font-mono-num text-3xl font-bold tracking-tight">₹{Number(profile?.wallet_balance || 0).toFixed(2)}</p>
        <p className="text-xs text-muted-foreground mt-2">40% platform fee applies on withdrawals</p>
      </div>

      <div className="flex gap-1 bg-secondary rounded-lg p-1">
        {[
          { id: "deposit" as Tab, label: "Deposit", icon: ArrowDownCircle },
          { id: "withdraw" as Tab, label: "Withdraw", icon: ArrowUpCircle },
          { id: "history" as Tab, label: "History", icon: History },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === "history") loadTransactions();
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-colors",
              activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "deposit" && (
        <div className="space-y-4">
          <div className="surface-card rounded-lg p-4 flex flex-col items-center">
            <p className="text-xs text-muted-foreground mb-3 font-medium">Scan QR to pay via UPI</p>
            <img src={upiQr} alt="UPI QR Code" className="w-48 h-48 rounded-lg object-contain bg-background" />
            <p className="text-xs text-muted-foreground mt-2">Scan to pay with any UPI app</p>
          </div>

          <div className="surface-card rounded-lg p-3 flex items-center gap-2 border-l-2 border-l-warning">
            <AlertCircle className="h-4 w-4 text-warning flex-shrink-0" />
            <p className="text-xs text-muted-foreground">Minimum deposit: ₹{MIN_DEPOSIT} · Max file size: 5MB</p>
          </div>

          <form onSubmit={handleDeposit} className="surface-card rounded-lg p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Deposit Amount (₹)</label>
              <input
                type="number"
                min={MIN_DEPOSIT}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                required
                className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={`Min ₹${MIN_DEPOSIT}`}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Payment Screenshot</label>
              <input
                type="file"
                ref={fileRef}
                accept="image/*"
                onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-10 rounded-lg border border-dashed border-border bg-background text-sm text-muted-foreground flex items-center justify-center gap-2 hover:border-primary/50 transition-colors"
              >
                <Camera className="h-4 w-4" />
                {screenshot ? screenshot.name : "Upload Screenshot"}
              </button>
            </div>

            {/* Upload Progress */}
            {submitting && uploadProgress > 0 && (
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !screenshot || !depositAmount}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {submitting ? `Uploading ${uploadProgress}%...` : "Submit Deposit Request"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "withdraw" && (
        <form onSubmit={handleWithdraw} className="surface-card rounded-lg p-4 space-y-4">
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning flex-shrink-0" />
            <p className="text-xs text-warning">Minimum withdrawal: ₹{MIN_WITHDRAWAL}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Withdrawal Amount (₹)</label>
            <input
              type="number"
              min={MIN_WITHDRAWAL}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              required
              className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder={`Min ₹${MIN_WITHDRAWAL}`}
            />
          </div>
          {withdrawAmount && parseFloat(withdrawAmount) >= MIN_WITHDRAWAL && (
            <div className="text-xs text-muted-foreground space-y-1 bg-secondary rounded-lg p-3">
              <p>Amount: ₹{parseFloat(withdrawAmount).toFixed(2)}</p>
              <p>Platform Fee (40%): ₹{(parseFloat(withdrawAmount) * PLATFORM_FEE).toFixed(2)}</p>
              <p className="text-foreground font-medium">You Receive: ₹{(parseFloat(withdrawAmount) * (1 - PLATFORM_FEE)).toFixed(2)}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={!withdrawAmount || parseFloat(withdrawAmount || "0") < MIN_WITHDRAWAL}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            Request Withdrawal
          </button>
        </form>
      )}

      {activeTab === "history" && (
        <div className="surface-card rounded-lg overflow-hidden">
          {loadingTx ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No transactions yet</div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium capitalize">{tx.type.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={cn(
                    "font-mono-num text-sm font-medium",
                    ["deposit", "winning", "refund", "admin_credit"].includes(tx.type) ? "text-success" : "text-destructive"
                  )}>
                    {["deposit", "winning", "refund", "admin_credit"].includes(tx.type) ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletPage;