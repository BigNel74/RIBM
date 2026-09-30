import { DomainRuleError } from "@/domain/shared/errors";
import { getSessionUser } from "@/server/auth/session";
import { getEvidenceFile } from "@/server/evidence/service";

/**
 * Authenticated evidence file download. Internal roles only (evidence:read);
 * files never live under public/. Images render inline; PDFs download.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/evidence/[id]/file">) {
  const user = await getSessionUser();
  if (!user) return new Response("Not found", { status: 404 });
  const { id } = await ctx.params;
  try {
    const file = await getEvidenceFile(user, id);
    const disposition = file.mime.startsWith("image/") ? "inline" : "attachment";
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(file.name)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
      },
    });
  } catch (e) {
    // Same response for "forbidden" and "missing" so ids cannot be probed.
    if (e instanceof DomainRuleError) return new Response("Not found", { status: 404 });
    throw e;
  }
}
