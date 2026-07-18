import { z } from "zod";

import { DomainRuleError } from "./errors";

export function parseDomainInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  const detail = result.error.issues
    .map((issue) => `${issue.path.join(".") || "entrada"}: ${issue.message}`)
    .join("; ");

  throw new DomainRuleError("INVALID_INPUT", detail);
}
