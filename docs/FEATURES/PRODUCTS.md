# Feature Guide: Products

## Where It Lives
- Product list: `app/(shop)/products/page.tsx`
- Product details: `app/(shop)/products/[id]/page.tsx`
- Product UI: `features/products/**`
- API routes: `app/api/products/**`
- Services: `lib/services/products.ts`

## Flow
1. Client calls `/api/products` with filters and pagination.
2. Server builds a query and returns products.
3. Product details page loads a single product by id.

## Variants
Variants are handled in:
- `features/products/ProductDetails.tsx`
- `lib/services/products.ts`

## Files to Read
- `features/products/ProductCard.tsx`
- `features/products/ProductDetails.tsx`
- `app/api/products/route.ts`
- `lib/services/products.ts`

