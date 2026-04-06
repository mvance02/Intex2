interface SkeletonLoaderProps {
  rows?: number;
  columns?: number;
}

function SkeletonCell() {
  return <div className="h-4 bg-gray-200 rounded animate-pulse" />;
}

export default function SkeletonLoader({ rows = 5, columns = 4 }: SkeletonLoaderProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200" aria-busy="true" aria-label="Loading data…">
      {/* Header skeleton */}
      <div className="bg-gray-50 px-4 py-3 grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-300 rounded animate-pulse w-3/4" />
        ))}
      </div>

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="bg-white px-4 py-3 grid gap-4 border-t border-gray-100"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <SkeletonCell key={colIdx} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonKpiCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
          <div className="flex justify-between">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
            <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-8 bg-gray-200 rounded animate-pulse w-16" />
          <div className="h-2 bg-gray-100 rounded animate-pulse w-20" />
        </div>
      ))}
    </div>
  );
}
