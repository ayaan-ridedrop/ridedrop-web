/**
 * Skeleton loaders for async content
 * Shows while data is loading
 */

export function SkeletonCard() {
  return (
    <div className="bg-white border border-rail rounded-xl px-5 py-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-rail rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-rail rounded w-3/4 mb-2" />
          <div className="h-3 bg-rail rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonCardList({ count = 5 }: { count?: number }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <SkeletonCard />
        </li>
      ))}
    </ul>
  );
}

export function SkeletonFormField() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-3 bg-rail rounded w-1/4" />
      <div className="h-10 bg-rail rounded-lg" />
    </div>
  );
}

export function SkeletonForm() {
  return (
    <div className="bg-white border border-rail rounded-2xl p-5 space-y-4 animate-pulse">
      <div className="h-5 bg-rail rounded w-1/3 mb-4" />
      <SkeletonFormField />
      <SkeletonFormField />
      <div className="h-10 bg-accent rounded-full" />
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2 mb-8">
        <div className="h-8 bg-rail rounded w-1/3" />
        <div className="h-4 bg-rail rounded w-2/3" />
      </div>
      <SkeletonCardList count={5} />
    </div>
  );
}
