import type { AnalysisResult, Finding, RiskLevel, ToolRiskSummary } from "@/core/types";
import {
  buildGeneratedSource,
  groupFindingsByToolId,
  renderYaml,
  type GeneratedSource,
} from "@/generators/helpers";

export type PolicyMode = "allow" | "require_review" | "require_confirmation";

export type PolicyOperation = {
  operationId: string;
  method: string;
  path: string;
  risk: RiskLevel;
  mode: PolicyMode;
  reasons: string[];
  recommendedControls: string[];
};

export type PolicyDraft = {
  version: 1;
  advisory: true;
  note: string;
  source: GeneratedSource;
  defaults: {
    mode: PolicyMode;
  };
  operations: Record<string, PolicyOperation>;
};

const ADVISORY_NOTE =
  "This policy is an advisory draft generated from static OpenAPI analysis. It is not enforced unless a runtime guard, proxy, or generated server implements it.";

/**
 * Generates an advisory guard policy draft from the shared analysis result.
 */
export function generatePolicyDraft(result: AnalysisResult): PolicyDraft {
  const findingsByToolId = groupFindingsByToolId(result.findings);
  const operations: Record<string, PolicyOperation> = {};

  for (const tool of result.tools) {
    const findings = findingsByToolId.get(tool.toolId) ?? [];
    operations[tool.toolId] = buildPolicyOperation(tool, findings);
  }

  return {
    version: 1,
    advisory: true,
    note: ADVISORY_NOTE,
    source: buildGeneratedSource(result),
    defaults: {
      mode: "allow",
    },
    operations,
  };
}

export function renderPolicyYaml(policy: PolicyDraft): string {
  return renderYaml(policy);
}

function buildPolicyOperation(tool: ToolRiskSummary, findings: Finding[]): PolicyOperation {
  const safetyFindings = findings.filter((finding) => finding.category === "safety");

  return {
    operationId: tool.toolId,
    method: tool.method,
    path: tool.path,
    risk: tool.risk,
    mode: selectPolicyMode(tool.risk, safetyFindings),
    reasons: buildReasons(tool, safetyFindings),
    recommendedControls: buildRecommendedControls(tool.risk, findings),
  };
}

function selectPolicyMode(risk: RiskLevel, safetyFindings: Finding[]): PolicyMode {
  if (risk === "critical" || risk === "high" || safetyFindings.some(isErrorFinding)) {
    return "require_confirmation";
  }

  if (risk === "medium" || safetyFindings.length > 0) {
    return "require_review";
  }

  return "allow";
}

function buildReasons(tool: ToolRiskSummary, safetyFindings: Finding[]): string[] {
  return [...tool.reasons, ...safetyFindings.map((finding) => finding.message)];
}

function buildRecommendedControls(risk: RiskLevel, findings: Finding[]): string[] {
  const controls = new Set<string>();

  if (risk === "high" || risk === "critical") {
    controls.add("Require explicit user confirmation before execution.");
  }

  for (const finding of findings) {
    for (const control of controlsForFinding(finding)) {
      controls.add(control);
    }
  }

  if (controls.size === 0) {
    controls.add("Allow by default; monitor normal tool execution logs.");
  }

  return [...controls];
}

function controlsForFinding(finding: Finding): string[] {
  switch (finding.ruleId) {
    case "safety/destructive-requires-guard":
      return ["Require confirmation or guard metadata for destructive execution."];
    case "safety/financial-requires-idempotency":
      return ["Require idempotency keys for financial mutations."];
    case "safety/external-communication-requires-guard":
      return ["Require recipient review before external communication is sent."];
    case "safety/mutating-requires-dry-run":
      return ["Prefer dry-run, preview, or validate-only mode before mutation."];
    case "schema/list-requires-pagination":
      return ["Apply a default result limit when the caller does not provide one."];
    case "schema/vague-boolean":
      return ["Require explicit review for ambiguous boolean inputs."];
    case "schema/string-should-be-enum":
      return ["Validate constrained string inputs against an allowed set."];
    case "schema/sensitive-response-fields":
      return ["Redact sensitive response fields before returning data to agents."];
    case "errors/missing-error-schema":
      return ["Normalize unstructured API errors before returning them to agents."];
    case "docs/missing-description":
      return ["Review tool descriptions before enabling autonomous selection."];
    default:
      return [finding.recommendation];
  }
}

function isErrorFinding(finding: Finding): boolean {
  return finding.severity === "error";
}
