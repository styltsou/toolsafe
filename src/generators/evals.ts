import type { AnalysisResult, Finding } from "@/core/types";
import { normalizeIdentifier } from "@/core/strings";
import { buildGeneratedSource, renderYaml, type GeneratedSource } from "@/generators/helpers";

export type EvalCase = {
  id: string;
  type: string;
  operationId: string;
  method: string;
  path: string;
  input: Record<string, unknown>;
  expectedBehavior: string;
  reason: string;
};

export type EvalIdeas = {
  version: 1;
  advisory: true;
  note: string;
  source: GeneratedSource;
  cases: EvalCase[];
};

const ADVISORY_NOTE =
  "These eval cases are deterministic suggestions from static OpenAPI analysis. They require adaptation to a concrete runtime, test harness, authentication model, and expected API error format before they are executable.";

/**
 * Generates recommended eval ideas from the shared analysis result.
 */
export function generateEvalIdeas(result: AnalysisResult): EvalIdeas {
  return {
    version: 1,
    advisory: true,
    note: ADVISORY_NOTE,
    source: buildGeneratedSource(result),
    cases: result.findings.map(findingToEvalCase),
  };
}

export function renderEvalIdeasYaml(evals: EvalIdeas): string {
  return renderYaml(evals);
}

function findingToEvalCase(finding: Finding): EvalCase {
  const template = evalTemplateForFinding(finding);

  return {
    id: createEvalCaseId(finding),
    type: template.type,
    operationId: finding.toolId,
    method: finding.method,
    path: finding.path,
    input: template.input,
    expectedBehavior: template.expectedBehavior,
    reason: template.reason,
  };
}

function evalTemplateForFinding(
  finding: Finding,
): Omit<EvalCase, "id" | "operationId" | "method" | "path"> {
  switch (finding.ruleId) {
    case "safety/destructive-requires-guard":
      return {
        type: "destructive_requires_confirmation",
        input: {
          confirmation: false,
          placeholders: {
            pathParams: "fill required path parameters",
          },
        },
        expectedBehavior:
          "The runtime should block execution or require explicit confirmation before the destructive operation is allowed.",
        reason: finding.message,
      };
    case "safety/financial-requires-idempotency":
      return {
        type: "financial_requires_idempotency",
        input: {
          idempotencyKey: null,
          placeholders: {
            requestBody: "fill minimal valid financial request body",
          },
        },
        expectedBehavior:
          "The runtime or API should reject financial mutations that omit an idempotency key or equivalent request identifier.",
        reason: finding.message,
      };
    case "safety/external-communication-requires-guard":
      return {
        type: "external_communication_requires_confirmation",
        input: {
          confirmation: false,
          placeholders: {
            requestBody: "fill minimal valid recipient and message fields",
          },
        },
        expectedBehavior:
          "The runtime should require recipient review or explicit confirmation before sending external communication.",
        reason: finding.message,
      };
    case "safety/mutating-requires-dry-run":
      return {
        type: "mutating_supports_preview_or_guard",
        input: {
          dryRun: true,
          placeholders: {
            requestBody: "fill minimal valid mutation request body",
          },
        },
        expectedBehavior:
          "The operation should either support preview/dry-run behavior or be covered by a guard before live mutation.",
        reason: finding.message,
      };
    case "schema/list-requires-pagination":
      return {
        type: "list_enforces_result_limit",
        input: {
          query: {},
        },
        expectedBehavior:
          "The runtime should apply a safe default limit or the API should require explicit pagination parameters.",
        reason: finding.message,
      };
    case "schema/vague-boolean":
      return {
        type: "ambiguous_boolean_requires_review",
        input: {
          placeholders: {
            booleanField: "toggle the flagged boolean field true and false",
          },
        },
        expectedBehavior:
          "The eval should verify that the boolean meaning is documented clearly or requires review before autonomous use.",
        reason: finding.message,
      };
    case "schema/string-should-be-enum":
      return {
        type: "constrained_string_rejects_invalid_value",
        input: {
          placeholders: {
            stringField: "__invalid_value__",
          },
        },
        expectedBehavior:
          "The API or runtime should reject invalid constrained string values with a structured validation error.",
        reason: finding.message,
      };
    case "schema/sensitive-response-fields":
      return {
        type: "sensitive_response_is_redacted",
        input: {
          placeholders: {
            request: "fill minimal valid request that returns the flagged response field",
          },
        },
        expectedBehavior:
          "Sensitive response fields should be redacted, omitted, or explicitly reviewed before being returned to an agent.",
        reason: finding.message,
      };
    case "errors/missing-error-schema":
      return {
        type: "error_response_is_structured",
        input: {
          placeholders: {
            invalidRequest: "send a request that should produce a generic 4xx validation failure",
          },
        },
        expectedBehavior:
          "The runtime should adapt API failures into a structured error with a generic code, message, and recoverability signal.",
        reason: finding.message,
      };
    case "docs/missing-description":
      return {
        type: "tool_description_is_reviewed",
        input: {},
        expectedBehavior:
          "The tool should not be enabled for autonomous selection until a human-readable purpose is documented.",
        reason: finding.message,
      };
    default:
      return {
        type: "finding_requires_eval",
        input: {},
        expectedBehavior: finding.recommendation,
        reason: finding.message,
      };
  }
}

function createEvalCaseId(finding: Finding): string {
  return normalizeIdentifier(`${finding.toolId}_${finding.ruleId}`, { lowercase: true });
}
