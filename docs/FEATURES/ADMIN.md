# Feature Guide: Admin

## Where It Lives
- Admin dashboard: `app/(admin)/admin/page.tsx`
- Admin users: `app/(admin)/admin/users/page.tsx`
- Admin orders: `app/(admin)/admin/orders/page.tsx`
- Admin products: `app/(admin)/admin/products/page.tsx`

## Data Sources
Admin screens use:
- RTK Query (`features/**`)
- Direct API fetch (`/api/admin/**`)

## Common Admin Actions
- Update order status
- Approve return requests
- Manage users and roles
- Create or edit products

## Files to Read
- `app/(admin)/admin/page.tsx`
- `app/(admin)/admin/orders/page.tsx`
- `app/(admin)/admin/users/page.tsx`
- `app/(admin)/admin/products/page.tsx`

