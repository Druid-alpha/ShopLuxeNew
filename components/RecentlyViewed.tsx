import * as React from 'react'
import ProductCard from '@/features/products/ProductCard'

const STORAGE_KEY = 'recentlyViewedProducts'

export default function RecentlyViewed({ title = 'Recently Viewed' }) {
  const [items, setItems] = React.useState([])
  const [expanded, setExpanded] = React.useState(false)

  React.useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      setItems(Array.isArray(stored) ? stored : [])
    } catch {
      setItems([])
    }
  }, [])

  if (!items.length) return null

  const visibleItems = expanded ? items.slice(0, 8) : items.slice(0, 4)

  return (
    <section className="space-y-5 rounded-3xl border border-gray-100 bg-gray-50/60 p-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase">{title}</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-2">Pick up where you left off</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black border-b border-transparent hover:border-black transition-colors"
          >
            {expanded ? 'Show Less' : 'Show More'}
          </button>
          <a
            href="/products"
            className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black border-b border-transparent hover:border-black transition-colors"
          >
            View All
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {visibleItems.map((product) => (
          <div key={product._id} className="h-full">
            <ProductCard product={product} variant="compact" />
          </div>
        ))}
      </div>
    </section>
  )
}


