"use client";

import { useFormState, useFormStatus } from "react-dom";
import { forgotPasswordAction, type AuthActionState } from "../../_actions/authActions";

const initialState: AuthActionState = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 w-full rounded-lg bg-black text-sm font-bold text-white disabled:opacity-60"
    >
      {pending ? "Sending..." : "Send reset link"}
    </button>
  );
}

export default function ForgotForm() {
  const [state, action] = useFormState(forgotPasswordAction, initialState);

  return (
    <form action={action} className="space-y-5">
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
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-600" : "text-rose-600"}`}>{state.message}</p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
