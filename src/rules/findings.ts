import type { Finding, FindingCategory, FindingSeverity, NormalizedTool, Rule } from '@/core/types';

const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

export function createFinding(
  rule: Rule,
  tool: NormalizedTool,
  options: {
    message: string;
    recommendation: string;
    severity?: FindingSeverity;
    category?: FindingCategory;
    evidence?: string[];
  },
): Finding {
  return {
    ruleId: rule.id,
    severity: options.severity ?? rule.defaultSeverity,
    category: options.category ?? rule.category,
    toolId: tool.id,
    toolName: tool.name,
    method: tool.method,
    path: tool.path,
    message: options.message,
    recommendation: options.recommendation,
    evidence: options.evidence,
  };
}

export function sortFindings(findings: Finding[]): Finding[] {
  return findings.toSorted((a, b) => {
    const severityComparison = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];

    if (severityComparison !== 0) {
      return severityComparison;
    }

    return (
      a.path.localeCompare(b.path) ||
      a.method.localeCompare(b.method) ||
      a.ruleId.localeCompare(b.ruleId)
    );
  });
}
