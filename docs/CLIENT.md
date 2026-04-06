# Client Side Guide (ShopLuxe)

This guide explains the client-side (browser) code: routes, components, state, and TypeScript patterns used in the UI.

---
## 1. Where Client Code Lives

- Routes (pages):
  - `app/(shop)/**`
  - `app/(auth)/**`
  - `app/(admin)/**` (admin UI routes)
- Shared UI: `components/**`
- Feature logic: `features/**`
- Redux store: `store/**`

Any file with `"use client"` is a client component and can use React hooks and browser APIs.

---
## 2. Core Client Flows

### 2.1 Product Browsing
File: `app/(shop)/products/page.tsx`
- Reads URL query params (search, filters, page).
- Calls `/api/products` and `/api/products/filters`.
- Displays cards using `features/products/ProductCard.tsx`.

### 2.2 Product Details
File: `features/products/ProductDetails.tsx`
- Handles variant selection.
- Adds items to cart through `features/cart/cartApi.ts`.

### 2.3 Cart
File: `app/(shop)/cart/page.tsx`
- Reads cart from Redux.
- Supports guest cart and logged-in cart.
- Changes quantity and variant.

### 2.4 Checkout & Payment
File: `app/(shop)/checkout/page.tsx`
- Creates pending reservation for orders.
- Keeps reservation alive while user checks out.

### 2.5 Orders (User)
Files:
- `app/(shop)/orders/page.tsx` (list)
- `app/(shop)/orders/[id]/page.tsx` (details + invoice)

---
## 3. State Management (Redux)

### 3.1 Store
File: `store/index.ts`

### 3.2 Slices
- `features/auth/authSlice.ts` (user + token)
- `features/cart/cartSlice.ts` (cart items)
- `features/wishlist/wishlistSlice.ts`

### 3.3 RTK Query APIs
Used for server calls:
- `features/products/productApi.ts`
- `features/orders/orderApi.ts`
- `features/auth/authApi.ts`
- `features/cart/cartApi.ts`

RTK Query handles caching, loading states, and refetching.

---
## 4. UI Components

### 4.1 Global Layout
- `app/layout.tsx`
- `app/app-shell.tsx`
- `components/Navbar.tsx`
- `components/Footer.tsx`

### 4.2 Shared UI
`components/ui/**` contains small reusable UI (buttons, inputs, etc.).

---
## 5. TypeScript On the Client

### 5.1 Props typing
```
type Props = { title: string; onClick: () => void }
function MyButton({ title, onClick }: Props) { ... }
```

### 5.2 Optional fields
```
type User = { name: string; avatarUrl?: string }
```

### 5.3 Union types
```
type Status = "pending" | "paid" | "failed"
```

### 5.4 Generics in RTK Query
RTK Query uses typed request/response shapes to keep API calls safe.

---
## 6. How to Trace Any Client Feature

1. Start at the route file under `app/(shop)` or `app/(admin)`.
2. Check which components it renders.
3. Follow API calls in `features/**/xxxApi.ts`.
4. Check matching API routes in `app/api/**`.

