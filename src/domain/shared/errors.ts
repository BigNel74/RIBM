/**
 * Raised when an operation would violate a Revenue Spine business rule.
 * `code` is stable and safe to show; `message` is operator-readable.
 */
export class DomainRuleError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DomainRuleError";
    this.code = code;
  }
}
