export type DomainErrorCode =
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "ORGANIZATION_MISMATCH"
  | "NOT_FOUND"
  | "ALREADY_BOOKED"
  | "CLASS_FULL"
  | "CLASS_UNAVAILABLE"
  | "BOOKING_NOT_CANCELLABLE"
  | "SESSION_NOT_ACTIVE"
  | "SET_NOT_FOUND"
  | "INCOMPLETE_SESSION";

export class DomainRuleError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainRuleError";
    this.code = code;
  }
}
