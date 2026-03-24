"use client";

import { useFormState, useFormStatus } from "react-dom";
import { registerAction, type AuthActionState } from "../../_actions/authActions";

const initialState: AuthActionState = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 w-full rounded-lg bg-black text-sm font-bold text-white disabled:opacity-60"
    >
      {pending ? "Creating account..." : "Create account"}
    </button>
  );
}

export default function RegisterForm() {
  const [state, action] = useFormState(registerAction, initialState);

  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-800">Full name</label>
        <input
          type="text"
          name="name"
          required
          placeholder="Your name"
          className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
        />
      </div>
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
          placeholder="Create a password"
          className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-800">Confirm password</label>
        <input
          type="password"
          name="confirmPassword"
          required
          placeholder="Repeat your password"
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
