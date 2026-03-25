import * as React from 'react'
import ProductCard from '@/features/products/ProductCard'

const STORAGE_KEY = 'recentlyViewedProducts'

export default function RecentlyViewed({ title = 'Recently Viewed' }) {
  const [items, setItems] = React.useState([])

  React.useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      setItems(Array.isArray(stored) ? stored : [])
    } catch {
      setItems([])
    }
  }, [])

  if (!items.length) return null

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">{title}</h2>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-2">Pick up where you left off</p>
        </div>
        <a
          href="/products"
          className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black border-b border-transparent hover:border-black transition-colors"
        >
          View All
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.slice(0, 8).map((product) => (
          <div key={product._id} className="h-full">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}


