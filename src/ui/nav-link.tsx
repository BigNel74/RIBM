"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`block rounded-md px-3 py-2 text-sm font-medium tracking-wide uppercase ${
        active
          ? "bg-ink-850 text-bone-100 shadow-[inset_2px_0_0_var(--color-signal-gold)]"
          : "text-bone-400 hover:bg-ink-850 hover:text-bone-100"
      }`}
    >
      {label}
    </Link>
  );
}
