import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

const MailboxPage = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [reads, setReads] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!user) return;
    const [mRes, rRes] = await Promise.all([
      supabase.from("mailbox_messages").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("mailbox_reads").select("message_id").eq("user_id", user.id),
    ]);
    setMessages(mRes.data || []);
    setReads(new Set((rRes.data || []).map((r: any) => r.message_id)));
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("mailbox-rt").on("postgres_changes", { event: "*", schema: "public", table: "mailbox_messages" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const markRead = async (id: string) => {
    if (reads.has(id)) return;
    await supabase.rpc("mailbox_mark_read", { p_message_id: id });
    setReads(new Set([...reads, id]));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <Inbox className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold tracking-tight">Mailbox</h1>
      </div>
      {messages.length === 0 ? (
        <div className="surface-card rounded-xl p-12 text-center text-sm text-muted-foreground">No messages.</div>
      ) : messages.map((m) => {
        const unread = !reads.has(m.id);
        return (
          <button key={m.id} onClick={() => markRead(m.id)} className={cn("w-full surface-card rounded-xl p-4 text-left flex gap-3", unread && "border-l-2 border-l-primary")}>
            <Mail className={cn("h-4 w-4 mt-1 flex-shrink-0", unread ? "text-primary" : "text-muted-foreground")} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={cn("text-sm truncate", unread ? "font-bold" : "font-medium")}>{m.title}</p>
                <p className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(m.created_at).toLocaleDateString()}</p>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{m.body}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default MailboxPage;
