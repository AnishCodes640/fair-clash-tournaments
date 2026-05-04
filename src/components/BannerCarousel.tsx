import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function BannerCarousel() {
  const [banners, setBanners] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const load = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("admin_banners")
        .select("*")
        .eq("is_active", true)
        .lte("starts_at", now)
        .order("priority", { ascending: false })
        .limit(10);
      setBanners((data || []).filter((b: any) => !b.ends_at || new Date(b.ends_at) > new Date()));
    };
    load();
    const ch = supabase.channel("banners-rt").on("postgres_changes", { event: "*", schema: "public", table: "admin_banners" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 4500);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;
  const b = banners[idx % banners.length] || banners[0];
  if (!b) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-border relative" style={{ background: b.bg_color || "#1a1a2e" }}>
      <div className="flex items-center gap-3 p-4">
        {b.image_url && <img src={b.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" loading="lazy" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{b.title}</p>
          {b.body && <p className="text-xs text-white/80 line-clamp-2">{b.body}</p>}
        </div>
        {b.cta_link && b.cta_text && (
          <a href={b.cta_link} className="text-xs font-bold bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-md whitespace-nowrap">{b.cta_text}</a>
        )}
      </div>
      {banners.length > 1 && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
          {banners.map((_, i) => <span key={i} className={`h-1 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-1.5 bg-white/40"}`} />)}
        </div>
      )}
    </div>
  );
}
