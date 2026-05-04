import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { ThemedAvatar } from "@/components/ThemedAvatar";

const SearchPage = () => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_users", { p_query: trimmed });
      if (!cancelled) {
        setResults(data || []);
        setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <SearchIcon className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold tracking-tight">Search Users</h1>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by username or display name…"
          className="w-full h-11 pl-10 pr-3 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {q.trim().length < 2 ? (
        <div className="surface-card rounded-xl p-12 text-center text-xs text-muted-foreground">
          Type at least 2 characters to search.
        </div>
      ) : results.length === 0 && !loading ? (
        <div className="surface-card rounded-xl p-12 text-center text-xs text-muted-foreground">
          No users match "{q}".
        </div>
      ) : (
        <div className="surface-card rounded-xl overflow-hidden divide-y divide-border">
          {results.map((u: any) => {
            const avatarUrl = u.avatar_url ? supabase.storage.from("avatars").getPublicUrl(u.avatar_url).data.publicUrl : null;
            return (
              <Link key={u.user_id} to={`/u/${u.user_id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">
                <ThemedAvatar src={avatarUrl} name={u.display_name || u.username} themeId={u.active_theme} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.display_name || u.username}</p>
                  <p className="text-[11px] text-muted-foreground truncate">@{u.username}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
