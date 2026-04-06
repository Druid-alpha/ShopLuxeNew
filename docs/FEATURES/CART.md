# Feature Guide: Cart

## Where It Lives
- Client page: `app/(shop)/cart/page.tsx`
- Redux slice: `features/cart/cartSlice.ts`
- API calls: `features/cart/cartApi.ts`
- API routes: `app/api/cart/**`
- Services: `lib/services/cart.ts`

## Flow (Guest)
1. Add to cart on product page.
2. Item saved in Redux + localStorage.

## Flow (Logged In)
1. Add to cart calls `/api/cart/add`.
2. Server updates user cart.
3. Client stores returned cart in Redux.

## Files to Read
- `features/cart/cartSlice.ts`
- `features/cart/cartApi.ts`
- `app/api/cart/add/route.ts`
- `lib/services/cart.ts`

