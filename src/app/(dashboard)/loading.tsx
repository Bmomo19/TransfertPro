export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-gray-100"/>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="h-3 w-24 rounded bg-gray-100 mb-3"/>
            <div className="h-7 w-32 rounded bg-gray-100"/>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-gray-50"/>
        ))}
      </div>
    </div>
  )
}
