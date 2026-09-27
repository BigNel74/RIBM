import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal-red">403</p>
        <h1 className="mt-2 text-xl font-semibold">You do not have access to this area.</h1>
        <p className="mt-2 text-sm text-bone-400">Ask an administrator if you believe your role should include it.</p>
        <Link href="/" className="mt-6 inline-block text-sm text-signal-gold underline underline-offset-4">
          Return to start
        </Link>
      </div>
    </main>
  );
}
