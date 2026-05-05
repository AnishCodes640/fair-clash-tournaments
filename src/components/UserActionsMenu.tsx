import { useEffect, useRef, useState } from "react";
import { MoreVertical, Flag, Ban, Loader2, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ReportDialog } from "./ReportDialog";

export function UserActionsMenu({
  targetUserId, targetName, contextUrl,
}: {
  targetUserId: string;
  targetName?: string | null;
  contextUrl?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("user_blocks")
        .select("id").eq("blocker_id", user.id).eq("blocked_id", targetUserId).maybeSingle();
      if (!cancelled) setBlocked(!!data);
    })();
    return () => { cancelled = true; };
  }, [targetUserId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggleBlock = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("toggle_block", { p_target: targetUserId });
    setBusy(false);
    const res = data as any;
    if (error || !res?.success) { toast.error(res?.error || error?.message || "Failed"); return; }
    setBlocked(!!res.blocked);
    toast.success(res.blocked ? "User blocked" : "User unblocked");
    setOpen(false);
  };

  return (
    <>
      <div ref={ref} className="relative">
        <button onClick={() => setOpen((o) => !o)}
          className="h-9 w-9 rounded-full bg-secondary hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <MoreVertical className="h-4 w-4" />
        </button>
        {open && (
          <div className="absolute right-0 top-11 z-50 w-44 surface-card rounded-xl shadow-xl overflow-hidden animate-fade-in">
            <button onClick={() => { setReportOpen(true); setOpen(false); }}
              className="w-full px-3 py-2.5 text-left text-xs font-medium flex items-center gap-2 hover:bg-accent transition-colors">
              <Flag className="h-3.5 w-3.5 text-destructive" /> Report user
            </button>
            <button onClick={toggleBlock} disabled={busy}
              className="w-full px-3 py-2.5 text-left text-xs font-medium flex items-center gap-2 hover:bg-accent transition-colors border-t border-border">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                blocked ? <ShieldOff className="h-3.5 w-3.5 text-warning" /> : <Ban className="h-3.5 w-3.5 text-destructive" />}
              {blocked ? "Unblock user" : "Block user"}
            </button>
          </div>
        )}
      </div>
      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)}
        targetUserId={targetUserId} targetName={targetName} contextUrl={contextUrl} />
    </>
  );
}
