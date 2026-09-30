import type { QaStatus } from "@/domain/shared/enums";
import { StatusChip } from "@/ui/primitives";

const LABEL: Record<QaStatus, string> = {
  NOT_READY: "Not ready",
  READY_FOR_QA: "Ready for QA",
  QA_FAILED: "QA failed",
  QA_PASSED: "QA passed",
  FINALIZED: "Finalized",
};

export function QaChip({ status }: { status: QaStatus }) {
  const tone = status === "QA_PASSED" || status === "FINALIZED" ? "verified" : status === "QA_FAILED" ? "critical" : "neutral";
  return <StatusChip tone={tone}>{LABEL[status]}</StatusChip>;
}
