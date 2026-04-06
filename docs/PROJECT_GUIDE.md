# ShopLuxe Project Guide (Server + Client + TypeScript)

This document explains how the server side and client side work in this project, and how TypeScript is used. It is written for beginners and uses examples from this codebase.

---
## 1. Big Picture (How It All Fits Together)

This project is a Next.js App Router application.

- Client side (browser): React components, UI, forms, filters, cart, admin dashboard.
- Server side (API + DB): Next API routes inside `app/api/**`, business logic in `lib/services/**`, MongoDB models in `lib/db/models/**`.

Typical flow:
1. User clicks something on the client (browser).
2. Client calls API route (`/api/...`) using Axios or RTK Query.
3. API route calls a service function in `lib/services/...`.
4. Service connects to MongoDB and reads or writes data.
5. API returns JSON back to the client.

---
## 2. Client Side (Browser)

### 2.1 Where Client Code Lives
- Pages (routes): `app/(shop)/**`, `app/(admin)/**`, `app/(auth)/**`
- UI components: `components/**`
- Feature logic and state: `features/**`
- Global state: `store/**`

### 2.2 Client vs Server Components
Files with `"use client"` at the top are client components.
They can use:
- `useState`, `useEffect`, `useRouter`
- Browser APIs (localStorage, window, document)

Example:
```
// app/(shop)/cart/page.tsx
"use client"
```

### 2.3 How Data Is Fetched on Client
You use Axios and RTK Query.

- Axios instance: `lib/axios.ts`
- RTK Query APIs: `features/**/xxxApi.ts`

Example (client):
```
const res = await axios.get('/products/filters')
```

Because `lib/axios.ts` has `baseURL=/api`, that becomes:
```
/api/products/filters
```

### 2.4 Client State (Redux)
Global state lives in `store/` and slices in `features/`.

Example:
- Cart slice: `features/cart/cartSlice.ts`
- Auth slice: `features/auth/authSlice.ts`

Reducers update state, and components read it with `useAppSelector`.

---
## 3. Server Side (API + DB)

### 3.1 API Routes
All API routes live in `app/api/**`.

Example:
```
app/api/products/filters/route.ts
```
This file only calls a service:
```
return getProductFilters(request)
```

### 3.2 Service Layer
Business logic lives in `lib/services/**`.

Example:
```
lib/services/products.ts
```
Functions here:
- connect to MongoDB
- read or write data
- return `NextResponse.json(...)`

### 3.3 Database Connection
Connection helper:
```
lib/db.ts
```
It creates one shared connection (`mongooseCache`) so you do not open many connections.

### 3.4 Mongoose Models
MongoDB schemas live in:
```
lib/db/models/*
```
Examples:
- `product.js`
- `order.js`
- `user.js`

These files define how data is stored in MongoDB.

---
## 4. TypeScript (Beginner Friendly)

TypeScript is JavaScript with types.
Types help you avoid bugs.

### 4.1 Basic Types
```
let name: string = "ShopLuxe"
let price: number = 5000
let isActive: boolean = true
```

### 4.2 Arrays
```
let tags: string[] = ["new", "sale"]
let prices: number[] = [100, 200]
```

### 4.3 Objects
```
type Product = {
  title: string
  price: number
  stock?: number // optional
}
```

### 4.4 Functions
```
function add(a: number, b: number): number {
  return a + b
}
```

### 4.5 Union Types
```
type Status = "pending" | "paid" | "failed"
let status: Status = "pending"
```

### 4.6 TypeScript in This Project
Look for types here:
- `types/**`
- `features/**`
- `lib/**`

Example in cart:
```
type GuestCartItem = CartItem & {
  key: string;
  qty: number;
}
```

This means a GuestCartItem is a CartItem plus extra fields.

---
## 5. How To Read Any File (Simple Method)

When you open a file:
1. Look at imports at the top.
2. Find the main function or component.
3. Identify what it returns or exports.
4. Check where it is used (search by name).

---
## 6. Common Next.js Terms (Quick)

- Route: A page URL (`/products`, `/orders/123`)
- API route: A backend endpoint (`/api/products`)
- Client component: Has `"use client"`
- Server component: No `"use client"`; runs on server
- Service: Business logic in `lib/services`

---
## 7. Where To Start Exploring

If you are learning, start here:

1. Client: `app/(shop)/products/page.tsx`
2. API: `app/api/products/route.ts`
3. Service: `lib/services/products.ts`
4. Model: `lib/db/models/product.js`

This shows the full flow from UI -> API -> DB.

---
## 8. Want Me To Explain A Specific File?

Tell me any file path and I will break it down line-by-line with examples.

