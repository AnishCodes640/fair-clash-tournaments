import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Flag, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "cheating", label: "Cheating / Bot use" },
  { id: "harassment", label: "Harassment / Abuse" },
  { id: "spam", label: "Spam / Scam" },
  { id: "impersonation", label: "Impersonation" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "other", label: "Other" },
];

export function ReportDialog({
  open, onClose, targetUserId, targetName, contextUrl,
}: {
  open: boolean;
  onClose: () => void;
  targetUserId: string;
  targetName?: string | null;
  contextUrl?: string;
}) {
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (reason.trim().length < 4) {
      toast.error("Please describe the issue (at least 4 characters).");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("submit_report", {
      p_target: targetUserId,
      p_category: category,
      p_reason: reason.trim(),
      p_context_url: contextUrl || null,
    });
    setBusy(false);
    const res = data as any;
    if (error || !res?.success) {
      toast.error(res?.error || error?.message || "Failed to submit report");
      return;
    }
    toast.success("Report submitted to admins");
    setReason("");
    setCategory(CATEGORIES[0].id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="surface-card rounded-2xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-destructive" />
            <h2 className="text-base font-bold">Report {targetName ? `@${targetName}` : "user"}</h2>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
          <div className="grid grid-cols-2 gap-1.5">
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className={cn("px-2.5 py-2 rounded-lg text-[11px] font-medium border transition-colors text-left",
                  category === c.id ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary text-muted-foreground hover:text-foreground")}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">What happened?</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the issue. Admins will review."
            maxLength={1000}
            rows={4}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <p className="text-[10px] text-muted-foreground text-right">{reason.length}/1000</p>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg bg-secondary text-sm font-medium hover:bg-accent transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={busy}
            className="flex-1 h-10 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
