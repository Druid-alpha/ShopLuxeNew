export default function Loading() {
  return (
    <section className="p-6 max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-10">
        <div className="space-y-4">
          <div className="h-80 bg-gray-200 rounded-3xl animate-pulse" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={`thumb-${idx}`} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-8 w-2/3 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
          <div className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>
    </section>
  );
}
