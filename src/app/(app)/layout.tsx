import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import { hasPermission } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/guards";
import { NavLink } from "@/ui/nav-link";
import { PRIMARY_NAV } from "@/ui/nav";
import { StatusChip } from "@/ui/primitives";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // The operator shell is internal. CLIENT users only ever see the portal.
  if (user.role === "CLIENT") redirect("/portal");

  const nav = PRIMARY_NAV.filter((item) => hasPermission(user.role, item.permission));

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-ink-700 bg-ink-900 px-3 py-5 md:flex">
        <div className="px-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal-gold">RUN It BAC</p>
          <p className="text-sm font-semibold">Revenue Spine OS</p>
        </div>
        <nav aria-label="Primary" className="mt-6 flex-1 space-y-0.5">
          {nav.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>
        <div className="border-t border-ink-700 px-3 pt-4">
          <p className="truncate text-sm">{user.name}</p>
          <div className="mt-1 flex items-center justify-between">
            <StatusChip>{user.role.replace("_", " ")}</StatusChip>
            <form action={logout}>
              <button type="submit" className="text-xs text-bone-400 underline-offset-4 hover:text-bone-100 hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Compact nav for narrow screens; the operator app is desktop-first. */}
        <nav aria-label="Primary" className="flex gap-1 overflow-x-auto border-b border-ink-700 bg-ink-900 px-2 py-2 md:hidden">
          {nav.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
