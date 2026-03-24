export default function Loading() {
  return (
    <section className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="hidden lg:block border rounded-lg p-4 h-fit">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={`filter-skel-${idx}`} className="h-4 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </aside>
        <div className="lg:col-span-3 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={`product-skel-${idx}`} className="border rounded-lg p-4 space-y-3 animate-pulse">
              <div className="h-40 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
