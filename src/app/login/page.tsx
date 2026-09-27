import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === "CLIENT" ? "/portal" : "/command");

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal-gold">RUN It BAC Media</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Revenue Spine OS</h1>
        <p className="mt-1 text-sm text-bone-400">Diagnose the leaks. Install the system. Track the improvement.</p>
        <div className="mt-8 rounded-lg border border-ink-700 bg-ink-900 p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
