export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* KPI skeleton */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-2xl" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="skeleton h-96 rounded-2xl" />
    </div>
  );
}
