import "server-only";
import { notFound } from "next/navigation";
import { DomainRuleError } from "@/domain/shared/errors";

/** Loads page data; a NOT_FOUND rule error becomes a 404. */
export async function loadOr404<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (e) {
    if (e instanceof DomainRuleError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
}
