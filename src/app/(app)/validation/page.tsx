import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth/guards";
import { ModulePending, PageHeader } from "@/ui/primitives";

export const metadata: Metadata = { title: "Validation" };

export default async function Page() {
  await requirePagePermission("validation:read");
  return (
    <>
      <PageHeader eyebrow="Market proof" title="Validation" />
      <ModulePending
        phase="Phase 6"
        purpose="Offer hypotheses, tests, buyer evidence, DOUBLE / TWEAK / PAUSE / KILL decisions, per-dimension confidence, and the marketing claim registry."
        next={["Offer stays TESTING until Demand, WTP, Delivery, and Outcome are HIGH with positive unit economics", "Quantitative public claims blocked without verified records"]}
      />
    </>
  );
}
