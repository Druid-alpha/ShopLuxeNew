# Server Side Guide (ShopLuxe)

This guide explains the server side: API routes, services, database models, and TypeScript usage.

---
## 1. Where Server Code Lives

- API routes: `app/api/**`
- Services (business logic): `lib/services/**`
- Database connection: `lib/db.ts`
- Mongoose models: `lib/db/models/**`

---
## 2. API Routes

Each route file handles HTTP requests and delegates to services.

Examples:
- `app/api/products/route.ts`
- `app/api/cart/add/route.ts`
- `app/api/orders/[id]/route.ts`

Pattern:
```
export async function GET(request: NextRequest) {
  return getProducts(request);
}
```

---
## 3. Service Layer

Services contain the real business logic and database calls.

Examples:
- `lib/services/products.ts`
- `lib/services/cart.ts`
- `lib/services/orders.ts`
- `lib/services/admin.ts`

Services usually:
1. Connect to DB
2. Validate input
3. Query or update MongoDB
4. Return `NextResponse.json(...)`

---
## 4. Database Connection

File: `lib/db.ts`

This file:
- Reads `MONGO_URI`
- Uses a global cache so you do not create many connections
- Exposes `connectDB()` for services

---
## 5. Models (MongoDB)

All schemas live in:
```
lib/db/models/*
```

Examples:
- `product.js`
- `order.js`
- `user.js`
- `review.js`
- `wishlist.js`

These define how MongoDB documents look and what fields are required.

---
## 6. Authentication

Helpers are in:
- `app/api/_utils/auth.ts`

It provides `requireAuth` and `requireAdmin` to protect routes.

---
## 7. File Uploads / Cloudinary

Files:
- `lib/middleware/upload.ts`
- `lib/config/cloudinary.ts`

These handle product images and uploads.

---
## 8. TypeScript On the Server

### 8.1 Request and Response Types
```
import type { NextRequest } from "next/server";
```

### 8.2 Service Function Example
```
export async function getProductFilters(request: NextRequest) {
  await connectDB();
  return NextResponse.json({ ... });
}
```

### 8.3 Why TS Helps
- Prevents wrong request shapes
- Detects missing fields
- Makes refactors safer

---
## 9. How to Trace Any Server Feature

1. Find API route under `app/api/**`
2. See which service it calls
3. Open the service file in `lib/services/**`
4. Check models used inside

