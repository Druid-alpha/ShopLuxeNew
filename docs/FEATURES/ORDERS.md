# Feature Guide: Orders

## Where It Lives
- User pages: `app/(shop)/orders/**`
- Admin page: `app/(admin)/admin/orders/page.tsx`
- API routes: `app/api/orders/**`
- Services: `lib/services/orders.ts`
- RTK Query: `features/orders/orderApi.ts`

## Flow (User)
1. User places order.
2. Order saved in DB.
3. User views orders at `/orders`.
4. User views receipt at `/orders/[id]`.
5. Invoice download calls `/api/orders/[id]/invoice/download`.

## Flow (Admin)
1. Admin lists orders in dashboard.
2. Admin updates status, return requests, refunds.

## Files to Read
- `app/(shop)/orders/page.tsx`
- `app/(shop)/orders/[id]/page.tsx`
- `features/orders/orderApi.ts`
- `app/api/orders/route.ts`
- `lib/services/orders.ts`

