import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import { requireUser } from "@/server/auth/guards";
import { assertClientAccess, assertPermission } from "@/server/auth/permissions";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Your reports" };

/**
 * Client portal. Access is scoped server-side to the user's bound client and
 * to PUBLISHED reports only; internal fields are never selected (A1).
 */
export default async function PortalPage() {
  const user = await requireUser();
  if (user.role !== "CLIENT") redirect("/command");
  assertPermission(user, "reports:read_own");
  const clientId = user.clientId!;
  assertClientAccess(user, clientId);

  const [client, reports] = await Promise.all([
    db.client.findUnique({ where: { id: clientId }, select: { displayName: true } }),
    db.clientReport.findMany({
      where: { clientId, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      select: { id: true, publishedAt: true, diagnostic: { select: { title: true } } },
    }),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal-gold">RUN It BAC Media</p>
          <h1 className="mt-1 text-xl font-semibold">{client?.displayName ?? "Your reports"}</h1>
        </div>
        <form action={logout}>
          <button type="submit" className="text-sm text-bone-400 underline underline-offset-4 hover:text-bone-100">
            Sign out
          </button>
        </form>
      </div>
      <section className="mt-8 rounded-lg border border-ink-700 bg-ink-900 p-5">
        <h2 className="text-sm font-semibold">Revenue Spine reports</h2>
        {reports.length === 0 ? (
          <p className="mt-2 text-sm text-bone-400">No reports have been published to you yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-700">
            {reports.map((r) => (
              <li key={r.id} className="flex justify-between py-2.5 text-sm">
                <span>{r.diagnostic.title}</span>
                <span className="font-mono text-xs text-bone-400">{r.publishedAt?.toISOString().slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
