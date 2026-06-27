import type { Finding, NormalizedTool, Rule } from '@/core/types';
import { dangerousAuthScopeRule } from '@/rules/auth/dangerous-auth-scope';
import { missingDescriptionRule } from '@/rules/docs/missing-description';
import { weakDescriptionRule } from '@/rules/docs/weak-description';
import { mutatingDescriptionMentionsSideEffectsRule } from '@/rules/docs/mutating-description-mentions-side-effects';
import { missingErrorSchemaRule } from '@/rules/errors/missing-error-schema';
import { sortFindings } from '@/rules/findings';
import { batchOperationRequiresLimitRule } from '@/rules/safety/batch-operation-requires-limit';
import { destructiveRequiresGuardRule } from '@/rules/safety/destructive-requires-guard';
import { externalCommunicationRequiresGuardRule } from '@/rules/safety/external-communication-requires-guard';
import { financialRequiresIdempotencyRule } from '@/rules/safety/financial-requires-idempotency';
import { mutatingRequiresDryRunRule } from '@/rules/safety/mutating-requires-dry-run';
import { listRequiresPaginationRule } from '@/rules/schema/list-requires-pagination';
import { sensitiveResponseFieldsRule } from '@/rules/schema/sensitive-response-fields';
import { stringShouldBeEnumRule } from '@/rules/schema/string-should-be-enum';
import { unconstrainedFileUploadRule } from '@/rules/schema/unconstrained-file-upload';
import { vagueBooleanRule } from '@/rules/schema/vague-boolean';

/**
 * Default MVP rule set.
 *
 * The order here is the execution order. Final output order is still sorted by
 * severity/path/method/rule ID so reports remain stable.
 */
export const defaultRules: Rule[] = [
  destructiveRequiresGuardRule,
  batchOperationRequiresLimitRule,
  dangerousAuthScopeRule,
  financialRequiresIdempotencyRule,
  externalCommunicationRequiresGuardRule,
  mutatingRequiresDryRunRule,
  listRequiresPaginationRule,
  unconstrainedFileUploadRule,
  vagueBooleanRule,
  stringShouldBeEnumRule,
  sensitiveResponseFieldsRule,
  missingDescriptionRule,
  weakDescriptionRule,
  mutatingDescriptionMentionsSideEffectsRule,
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

export { dangerousAuthScopeRule } from '@/rules/auth/dangerous-auth-scope';
export { missingDescriptionRule } from '@/rules/docs/missing-description';
export { weakDescriptionRule } from '@/rules/docs/weak-description';
export { mutatingDescriptionMentionsSideEffectsRule } from '@/rules/docs/mutating-description-mentions-side-effects';
export { missingErrorSchemaRule } from '@/rules/errors/missing-error-schema';
export { batchOperationRequiresLimitRule } from '@/rules/safety/batch-operation-requires-limit';
export { destructiveRequiresGuardRule } from '@/rules/safety/destructive-requires-guard';
export { externalCommunicationRequiresGuardRule } from '@/rules/safety/external-communication-requires-guard';
export { financialRequiresIdempotencyRule } from '@/rules/safety/financial-requires-idempotency';
export { mutatingRequiresDryRunRule } from '@/rules/safety/mutating-requires-dry-run';
export { listRequiresPaginationRule } from '@/rules/schema/list-requires-pagination';
export { sensitiveResponseFieldsRule } from '@/rules/schema/sensitive-response-fields';
export { stringShouldBeEnumRule } from '@/rules/schema/string-should-be-enum';
export { unconstrainedFileUploadRule } from '@/rules/schema/unconstrained-file-upload';
export { vagueBooleanRule } from '@/rules/schema/vague-boolean';
