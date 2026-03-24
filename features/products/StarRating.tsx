import React from 'react'

const STAR_PATH =
  'M12 2.25l2.96 6 6.62.96-4.79 4.67 1.13 6.6L12 17.77 6.08 20.48l1.13-6.6-4.79-4.67 6.62-.96L12 2.25z'

function StarIcon({
  size,
  fill,
  stroke,
  clipPercent,
  clipId,
}: {
  size: number
  fill: string
  stroke: string
  clipPercent?: number
  clipId?: string
}) {
  if (typeof clipPercent === 'number') {
    const resolvedClipId = clipId || `star-clip-${Math.round(clipPercent * 1000)}-${size}`
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <clipPath id={resolvedClipId}>
            <rect x="0" y="0" width={`${clipPercent * 100}%`} height="100%" />
          </clipPath>
        </defs>
        <path d={STAR_PATH} fill="none" stroke={stroke} strokeWidth="1.5" />
        <path d={STAR_PATH} fill={fill} clipPath={`url(#${resolvedClipId})`} />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={STAR_PATH} fill={fill} stroke={stroke} strokeWidth="1.5" />
    </svg>
  )
}

export default function StarRating({ rating = 0, maxStars = 5, size = 20 }) {
  const safeRating = Number.isFinite(rating) ? Math.max(0, rating) : 0
  const fullStars = Math.floor(safeRating)
  const hasHalfStar = safeRating - fullStars >= 0.5
  const emptyStars = Math.max(0, maxStars - fullStars - (hasHalfStar ? 1 : 0))
  const baseId = React.useId()

  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating ${safeRating} out of ${maxStars}`}>
      {Array.from({ length: fullStars }).map((_, idx) => (
        <StarIcon key={`full-${idx}`} size={size} fill="#facc15" stroke="#facc15" />
      ))}

      {hasHalfStar && (
        <StarIcon size={size} fill="#facc15" stroke="#d1d5db" clipPercent={0.5} clipId={`${baseId}-half`} />
      )}

      {Array.from({ length: emptyStars }).map((_, idx) => (
        <StarIcon key={`empty-${idx}`} size={size} fill="none" stroke="#d1d5db" />
      ))}
    </div>
  )
}



