# Feature Guide: Auth

## Where It Lives
- Client pages: `app/(auth)/**`
- API routes: `app/api/auth/**`
- Redux: `features/auth/**`
- Utilities: `app/api/_utils/auth.ts`

## Flow
1. User submits login/register form.
2. Client calls `/api/auth/login` or `/api/auth/register`.
3. API validates and returns tokens + user.
4. Client stores user/token in Redux.

## Files to Read
- `app/(auth)/login/page.tsx`
- `features/auth/authApi.ts`
- `features/auth/authSlice.ts`
- `app/api/auth/login/route.ts`

