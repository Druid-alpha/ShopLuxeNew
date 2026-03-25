
import React from 'react'
import { Input } from './ui/input'
import { Button } from './ui/button'

export default function ProductSearch({ search, setSearch, onSearch = undefined, suggestions = [], onSuggestion = undefined }) {
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const hasSuggestions = Array.isArray(suggestions) && suggestions.length > 0
  const handleKeyDown = (e) => {
    if (hasSuggestions && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      setActiveIndex((prev) => {
        const max = suggestions.length - 1
        if (e.key === 'ArrowDown') return prev >= max ? 0 : prev + 1
        return prev <= 0 ? max : prev - 1
      })
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (hasSuggestions && activeIndex >= 0) {
        const selected = suggestions[activeIndex]
        if (onSuggestion) {
          onSuggestion(selected)
        } else {
          setSearch(selected)
        }
        setActiveIndex(-1)
        if (onSearch) onSearch(selected)
        return
      }
      if (onSearch) onSearch(search)
    }
    if (e.key === 'Escape') {
      setActiveIndex(-1)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center relative">
        <Input
          placeholder="Search products, brands, or categories..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setActiveIndex(-1)
          }}
          onKeyDown={handleKeyDown}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black border border-gray-200 rounded-full px-3 py-2"
          >
            Clear
          </button>
        )}
        {onSearch && (
          <Button onClick={() => onSearch(search)} className="shrink-0">Search</Button>
        )}
      </div>
      {hasSuggestions && (
        <div className="mt-2 rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {suggestions.map((s, idx) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                if (onSuggestion) {
                  onSuggestion(s)
                } else {
                  setSearch(s)
                }
                setActiveIndex(-1)
                if (onSearch) onSearch(s)
              }}
              className={`w-full text-left px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
                idx === activeIndex ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


