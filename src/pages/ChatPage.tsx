import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Send, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ThemedAvatar } from "@/components/ThemedAvatar";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
  deleted_for_sender: boolean;
  deleted_for_recipient: boolean;
}

const ChatPage = () => {
  const { userId: otherId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [other, setOther] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadProfile = async () => {
    if (!otherId) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url, active_theme")
      .eq("user_id", otherId)
      .maybeSingle();
    setOther(data);
  };

  const loadMessages = async () => {
    if (!user || !otherId) return;
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: true })
      .limit(500);
    setMessages((data || []) as Message[]);
    setLoading(false);
    // mark conversation read
    await supabase.rpc("mark_conversation_read", { p_other: otherId });
  };

  useEffect(() => {
    if (!user || !otherId) return;
    loadProfile();
    loadMessages();
    const ch = supabase.channel(`chat-${user.id}-${otherId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () => loadMessages())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, otherId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-sm text-muted-foreground">Sign in to chat.</p>
        <button onClick={() => navigate("/auth")} className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Sign in</button>
      </div>
    );
  }

  const handleSend = async () => {
    const body = text.trim();
    if (!body || !otherId) return;
    setSending(true);
    setText("");
    const { data, error } = await supabase.rpc("send_direct_message", { p_recipient: otherId, p_body: body });
    setSending(false);
    const res = data as any;
    if (error || !res?.success) {
      toast.error(res?.error || error?.message || "Failed to send");
      setText(body);
    }
  };

  const handleDelete = async (id: string) => {
    const { data, error } = await supabase.rpc("delete_direct_message", { p_message_id: id });
    const res = data as any;
    if (error || !res?.success) { toast.error(res?.error || error?.message || "Failed"); return; }
    toast.success("Message removed");
    loadMessages();
  };

  const visible = messages.filter((m) =>
    (m.sender_id === user.id && !m.deleted_for_sender) ||
    (m.recipient_id === user.id && !m.deleted_for_recipient)
  );

  const avatarUrl = other?.avatar_url ? supabase.storage.from("avatars").getPublicUrl(other.avatar_url).data.publicUrl : null;

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-9rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 z-30">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        {other && (
          <Link to={`/u/${other.user_id}`} className="flex items-center gap-2.5 flex-1 min-w-0">
            <ThemedAvatar src={avatarUrl} name={other.display_name || other.username} themeId={other.active_theme} size={36} />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{other.display_name || other.username}</p>
              <p className="text-[10px] text-muted-foreground truncate">@{other.username}</p>
            </div>
          </Link>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-12">
            Say hi to start the conversation 👋
          </div>
        ) : visible.map((m) => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} className={cn("flex group", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 relative",
                mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm")}>
                <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                <p className={cn("text-[9px] mt-0.5 opacity-60",
                  mine ? "text-right" : "text-left")}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {mine && (m.is_read ? " · Seen" : " · Sent")}
                </p>
                <button onClick={() => handleDelete(m.id)}
                  className={cn("absolute -top-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-destructive",
                    mine ? "-left-7" : "-right-7")}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-background px-3 py-3 flex items-center gap-2 sticky bottom-16">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Type a message…"
          maxLength={2000}
          className="flex-1 h-11 px-4 rounded-full bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button onClick={handleSend} disabled={sending || !text.trim()}
          className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-opacity">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
