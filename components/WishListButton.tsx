


import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { toggleGuestWishlist } from '@/features/wishlist/wishlistSlice'
import * as React from 'react'

export default function WishListButton({ product }) {
  const dispatch = useAppDispatch()
  const wishList = useAppSelector((state) => state.wishlist.items)
  const isWishListed = wishList.some((item) => String(item) === String(product._id))
  return (
    <div>
      <span className={`cursor-pointer text-2xl ${isWishListed ? 'text-red-500' : 'text-gray-300'}`}
        onClick={() => dispatch(toggleGuestWishlist(String(product._id)))}
      >
        Love
      </span>
    </div>
  )
}



