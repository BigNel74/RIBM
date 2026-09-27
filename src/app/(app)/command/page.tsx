import type { Metadata } from "next";
import { requirePagePermission } from "@/server/auth/guards";
import { ModulePending, PageHeader } from "@/ui/primitives";

export const metadata: Metadata = { title: "Command" };

export default async function Page() {
  await requirePagePermission("command:read");
  return (
    <>
      <PageHeader eyebrow="Revenue target → activity" title="Command" />
      <ModulePending
        phase="Phase 5"
        purpose="Turns the monthly collected-cash target into one executable command. The calculation engine and its insufficient-data guard are built and tested (domain/command)."
        next={["Enter target, collected, contracted, recurring, and trailing counts", "Revenue gap, required wins / proposals / conversations", "INSUFFICIENT DATA instead of false precision; scenario ranges labeled ASSUMPTION"]}
      />
    </>
  );
}
