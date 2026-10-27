export default function AppLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-5" role="status" aria-label="Loading page">
      <div className="flex items-center justify-between gap-4">
        <div className="h-6 w-36 animate-pulse rounded bg-stone-200" />
        <div className="h-10 w-28 animate-pulse rounded-lg bg-stone-200" />
      </div>
      <div className="h-9 w-2/3 animate-pulse rounded-full bg-stone-100" />
      <div className="overflow-hidden rounded-xl ring-1 ring-stone-200">
        <div className="h-11 animate-pulse bg-stone-100" />
        {[0, 1, 2].map((row) => (
          <div key={row} className="grid grid-cols-4 gap-4 border-t border-stone-100 bg-white px-4 py-5 md:grid-cols-8">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((cell) => (
              <div key={cell} className={`h-4 animate-pulse rounded bg-stone-100 ${cell > 3 ? "hidden md:block" : ""}`} />
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
