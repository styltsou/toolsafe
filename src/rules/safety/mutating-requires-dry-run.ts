import type { HttpMethod, Rule } from "@/core/types";
import { hasAnyInputField } from "@/core/schema";
import { createFinding } from "@/rules/findings";

const MUTATING_METHODS = new Set<HttpMethod>(["POST", "PUT", "PATCH", "DELETE"]);

const DRY_RUN_FIELDS = [
  "dryRun",
  "dry_run",
  "preview",
  "validateOnly",
  "validate_only",
  "planOnly",
  "plan_only",
];

/**
 * Encourages reversible planning affordances for mutating operations.
 *
 * The rule is a warning because not every API can support dry-run semantics,
 * but the absence is important for agent-readiness review.
 */
export const mutatingRequiresDryRunRule: Rule = {
  id: "safety/mutating-requires-dry-run",
  name: "Mutating operation should support dry-run or preview",
  description:
    "Flags mutating operations that do not expose dryRun, preview, validateOnly, or planOnly inputs.",
  category: "safety",
  defaultSeverity: "warning",
  check: ({ tool }) => {
    if (!MUTATING_METHODS.has(tool.method) || hasAnyInputField(tool, DRY_RUN_FIELDS)) {
      return [];
    }

    return [
      createFinding(mutatingRequiresDryRunRule, tool, {
        message: "Mutating operation does not expose dry-run, preview, or validate-only mode.",
        recommendation:
          "Add dry-run, preview, or validate-only support when possible. Otherwise mark the operation as guarded.",
        evidence: [`HTTP method ${tool.method}`],
      }),
    ];
  },
};
