import type { HttpMethod, Rule } from "@/core/types";
import { hasAnyInputField } from "@/core/schema";
import { includesAny } from "@/core/strings";
import { createFinding } from "@/rules/findings";
import { getOperationSearchText } from "@/rules/helpers";

const MUTATING_METHODS = new Set<HttpMethod>(["POST", "PUT", "PATCH", "DELETE"]);

const FINANCIAL_KEYWORDS = [
  "payment",
  "charge",
  "refund",
  "transfer",
  "payout",
  "invoice",
  "billing",
  "subscription",
  "credit",
  "debit",
  "bank",
];

const IDEMPOTENCY_FIELDS = [
  "idempotencyKey",
  "idempotency_key",
  "Idempotency-Key",
  "requestId",
  "request_id",
  "operationId",
  "dedupeKey",
  "dedupe_key",
];

/**
 * Flags financial mutations that lack an idempotency affordance.
 */
export const financialRequiresIdempotencyRule: Rule = {
  id: "safety/financial-requires-idempotency",
  name: "Financial mutation should require idempotency",
  description:
    "Flags financial mutating operations that do not expose an idempotency key or request ID.",
  category: "safety",
  defaultSeverity: "warning",
  check: ({ tool }) => {
    const searchText = getOperationSearchText(tool);
    const isFinancialMutation =
      MUTATING_METHODS.has(tool.method) && includesAny(searchText, FINANCIAL_KEYWORDS);

    if (!isFinancialMutation || hasAnyInputField(tool, IDEMPOTENCY_FIELDS)) {
      return [];
    }

    return [
      createFinding(financialRequiresIdempotencyRule, tool, {
        message: "Financial mutating operation does not expose an idempotency key.",
        recommendation:
          "Add an idempotency key, request ID, or equivalent deduplication field before exposing this operation to agents.",
        evidence: [`HTTP method ${tool.method}`, "Financial operation keyword"],
      }),
    ];
  },
};
