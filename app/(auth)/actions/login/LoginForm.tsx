"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type AuthActionState } from "../../_actions/authActions";

const initialState: AuthActionState = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 w-full rounded-lg bg-black text-sm font-bold text-white disabled:opacity-60"
    >
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

export default function LoginForm({ returnTo }: { returnTo?: string }) {
  const [state, action] = useFormState(loginAction, initialState);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="returnTo" value={returnTo || "/profile"} />
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-800">Email address</label>
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-800">Password</label>
        <input
          type="password"
          name="password"
          required
          placeholder="Enter your password"
          className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
        />
      </div>
      {!state.ok && state.message ? (
        <p className="text-sm text-rose-600">{state.message}</p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
