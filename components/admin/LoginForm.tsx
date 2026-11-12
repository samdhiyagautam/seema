"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { signInAction, type AuthState } from "@/lib/actions/auth";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signInAction, {
    error: null,
  });

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          required
          autoComplete="email"
          placeholder="you@studio.com"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          required
          autoComplete="current-password"
        />
      </div>

      {state.error && <p className="field-error">{state.error}</p>}

      <button type="submit" className="btn btn-primary w-full justify-center" disabled={pending}>
        {pending ? <Loader2 size={15} className="animate-spin" /> : null}
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
