export function LeaderboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Podium */}
      <div className="grid grid-cols-3 gap-3 items-end">
        <div className="h-32 rounded-2xl bg-secondary/60" />
        <div className="h-44 rounded-2xl bg-secondary/80" />
        <div className="h-28 rounded-2xl bg-secondary/60" />
      </div>
      {/* Rows */}
      <div className="surface-card rounded-2xl divide-y divide-border overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3">
            <div className="h-5 w-5 rounded-md bg-secondary" />
            <div className="h-12 w-12 rounded-xl bg-secondary" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-1/2 rounded bg-secondary" />
              <div className="h-2.5 w-1/3 rounded bg-secondary/70" />
            </div>
            <div className="h-3 w-12 rounded bg-secondary" />
          </div>
        ))}
      </div>
    </div>
  );
}
