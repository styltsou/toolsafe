import type { Finding, NormalizedTool, Rule } from "@/core/types";
import { missingDescriptionRule } from "@/rules/docs/missing-description";
import { missingErrorSchemaRule } from "@/rules/errors/missing-error-schema";
import { sortFindings } from "@/rules/findings";
import { destructiveRequiresGuardRule } from "@/rules/safety/destructive-requires-guard";
import { externalCommunicationRequiresGuardRule } from "@/rules/safety/external-communication-requires-guard";
import { financialRequiresIdempotencyRule } from "@/rules/safety/financial-requires-idempotency";
import { mutatingRequiresDryRunRule } from "@/rules/safety/mutating-requires-dry-run";
import { listRequiresPaginationRule } from "@/rules/schema/list-requires-pagination";
import { sensitiveResponseFieldsRule } from "@/rules/schema/sensitive-response-fields";
import { stringShouldBeEnumRule } from "@/rules/schema/string-should-be-enum";
import { vagueBooleanRule } from "@/rules/schema/vague-boolean";

/**
 * Default MVP rule set.
 *
 * The order here is the execution order. Final output order is still sorted by
 * severity/path/method/rule ID so reports remain stable.
 */
export const defaultRules: Rule[] = [
  destructiveRequiresGuardRule,
  financialRequiresIdempotencyRule,
  externalCommunicationRequiresGuardRule,
  mutatingRequiresDryRunRule,
  listRequiresPaginationRule,
  vagueBooleanRule,
  stringShouldBeEnumRule,
  sensitiveResponseFieldsRule,
  missingDescriptionRule,
  missingErrorSchemaRule,
];

/**
 * Runs every rule against every normalized operation.
 *
 * Rule implementations are expected to be pure: they receive the current tool
 * plus the full operation list and return zero or more findings.
 */
export function runRules(tools: NormalizedTool[], rules: Rule[] = defaultRules): Finding[] {
  const findings: Finding[] = [];

  for (const tool of tools) {
    for (const rule of rules) {
      findings.push(
        ...rule.check({
          tool,
          allTools: tools,
        }),
      );
    }
  }

  return sortFindings(findings);
}

export { missingDescriptionRule } from "@/rules/docs/missing-description";
export { missingErrorSchemaRule } from "@/rules/errors/missing-error-schema";
export { destructiveRequiresGuardRule } from "@/rules/safety/destructive-requires-guard";
export { externalCommunicationRequiresGuardRule } from "@/rules/safety/external-communication-requires-guard";
export { financialRequiresIdempotencyRule } from "@/rules/safety/financial-requires-idempotency";
export { mutatingRequiresDryRunRule } from "@/rules/safety/mutating-requires-dry-run";
export { listRequiresPaginationRule } from "@/rules/schema/list-requires-pagination";
export { sensitiveResponseFieldsRule } from "@/rules/schema/sensitive-response-fields";
export { stringShouldBeEnumRule } from "@/rules/schema/string-should-be-enum";
export { vagueBooleanRule } from "@/rules/schema/vague-boolean";
