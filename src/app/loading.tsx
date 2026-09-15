export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20">
      <div className="space-y-10">
        {/* Hero skeleton */}
        <div className="h-[340px] animate-pulse rounded-[2rem] bg-gradient-to-r from-para-100/60 via-mint to-para-100/40" />

        {/* Categories skeleton */}
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-3xl" />
          ))}
        </div>

        {/* Products skeleton */}
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="skeleton aspect-square rounded-3xl" />
              <div className="skeleton h-4 w-3/4 rounded-full" />
              <div className="skeleton h-3 w-1/2 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
