# NextClass4 (Full-Stack Next.js)

This project is a **pure Next.js App Router** codebase (no separate Express server).
API endpoints live in `app/api/*` and call reusable server logic in `lib/services/*`.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Project Layout

- `app/` App Router pages, layouts, and route handlers (`app/api/*`)
- `components/` shared UI components
- `features/` feature modules (Redux slices, RTK Query endpoints)
- `lib/` server-side utilities, services, db connection, models
- `store/` Redux store setup
- `types/` shared types

## Environment Variables

Create a `.env.local` with values like:

- `MONGO_URI`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `JWT_ACCESS_EXPIRES`
- `JWT_REFRESH_EXPIRES`
- `CLIENT_URL`
- `COOKIE_DOMAIN`
- `COOKIE_SECURE`
- `COOKIE_SAME_SITE`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `PAYSTACK_SECRET_KEY`
- `NEXT_PUBLIC_PAYSTACK_PUBLICKEY`
- `SMTP_USER`
- `SMTP_PASS`
- `INVOICE_RETENTION_DAYS`
- `INVOICE_CLEANUP_INTERVAL_HOURS`
- `INVOICE_CLEANUP_ENABLED`
- `NEXT_PUBLIC_API_URL` (optional, defaults to `/api`)

## Next.js Concepts Covered

- App Router layouts and route groups
- Route handlers (`app/api/*`) for a full-stack API
- Server utilities and Mongoose models
- Client components with Redux Toolkit + RTK Query
- File-based routing with dynamic segments
- Parallel routes + intercepting routes
- Server Actions + optimistic UI
- Caching, tags, and revalidation
- Streaming with Suspense
- Edge runtime example + middleware

## Learning Routes

- `/` -> main shop
- `/next-concepts` -> master checklist
- `/products/featured` -> cached server page + revalidate
- `/learn` -> auth parallel + modal routes
- `/admin/overview` -> parallel routes + revalidation + streaming
- `/admin/actions/products` -> server actions + optimistic UI
- `/admin/actions/reviews` -> server actions + optimistic UI
- `/actions/login` -> auth server action demo
- `/cart/actions` -> cart server action demo
- `/api/edge/ping` -> edge runtime

## Status

All major Next.js concepts requested are now implemented. If you want more, the next natural steps are:

- Automated tests (Playwright + Vitest)
- Deployment setup (Vercel)
- Performance profiling and bundle analysis
