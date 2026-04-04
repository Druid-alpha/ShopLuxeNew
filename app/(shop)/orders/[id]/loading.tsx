export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-gray-100 p-3 rounded-2xl animate-pulse">
              <div className="h-8 w-8 rounded-full bg-gray-200" />
            </div>
            <div className="space-y-3">
              <div className="h-5 w-44 rounded bg-gray-200 animate-pulse" />
              <div className="h-3 w-60 rounded bg-gray-100 animate-pulse" />
              <div className="h-5 w-24 rounded-full bg-gray-100 animate-pulse" />
            </div>
          </div>
          <div className="h-10 w-48 rounded-lg bg-gray-100 animate-pulse" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="h-3 w-40 rounded bg-gray-100 animate-pulse" />
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={`step-${idx}`} className="flex flex-col items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-200 animate-pulse" />
                <div className="h-2 w-10 rounded bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
              <div className="h-4 w-52 rounded bg-gray-200 animate-pulse" />
            </div>
            <div className="h-6 w-28 rounded-full bg-gray-100 animate-pulse" />
          </div>
          <div className="h-20 w-full rounded-xl bg-gray-100 animate-pulse" />
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 w-full" />
          <div className="p-8 md:p-16 space-y-10">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-10">
              <div className="space-y-4">
                <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
                <div className="h-10 w-48 rounded bg-gray-100 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
                <div className="h-3 w-44 rounded bg-gray-100 animate-pulse" />
                <div className="h-3 w-36 rounded bg-gray-100 animate-pulse" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 pt-6 border-t border-gray-50">
              <div className="space-y-3">
                <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
                <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
                <div className="h-3 w-32 rounded bg-gray-100 animate-pulse" />
                <div className="h-3 w-48 rounded bg-gray-100 animate-pulse" />
              </div>
              <div className="space-y-3 sm:text-right">
                <div className="h-3 w-28 rounded bg-gray-100 animate-pulse sm:ml-auto" />
                <div className="h-3 w-40 rounded bg-gray-100 animate-pulse sm:ml-auto" />
                <div className="h-3 w-32 rounded bg-gray-100 animate-pulse sm:ml-auto" />
              </div>
            </div>

            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={`row-${idx}`} className="h-8 w-full rounded bg-gray-100 animate-pulse" />
              ))}
            </div>

            <div className="flex justify-end pt-6 border-t border-dashed border-gray-100">
              <div className="w-full sm:w-72 space-y-3">
                <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
                <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
                <div className="h-8 w-full rounded bg-gray-200 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-4 pb-12">
          <div className="h-12 w-full sm:w-48 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-12 w-full sm:w-48 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
