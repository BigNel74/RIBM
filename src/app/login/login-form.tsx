"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { login, type LoginState } from "./actions";

const initial: LoginState = { error: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);

  // Keep the email after a failed attempt (React 19 would reset the whole form); clear only the password.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    (form.elements.namedItem("password") as HTMLInputElement).value = "";
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-bone-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2.5 text-bone-100 placeholder:text-ink-500 focus:border-signal-gold focus:outline-none"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-bone-300">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2.5 text-bone-100 focus:border-signal-gold focus:outline-none"
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-signal-red">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-signal-red-fill px-4 py-2.5 font-medium text-white hover:bg-[#9d1d23] disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
