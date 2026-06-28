import type { FetchOptions } from '@/fetch';
import type { ToolSafeConfig } from '@/config/types';
import { parseOpenApi } from '@/parsers/openapi';
import { defaultRules, runRules } from '@/rules';
import type { Rule } from '@/core/types';
import { normalizeOpenApi } from '@/core/normalize';
import { classifyToolRisks } from '@/core/risk';
import { calculateScores } from '@/core/scoring';
import type { AnalysisResult, Finding, NormalizedTool, ToolRiskSummary } from '@/core/types';
import { suppressIgnoredFindings } from '@/core/suppression';

/**
 * Runs ToolSafe's complete deterministic analysis pipeline for one local file.
 *
 * This function is the core boundary that CLI commands and report generators
 * should call. Keeping parsing, normalization, rules, risk, and scoring here
 * prevents later outputs from each assembling slightly different results.
 */
export async function analyzeOpenApi(
  filePath: string,
  config?: ToolSafeConfig,
  fetchOptions?: FetchOptions,
): Promise<AnalysisResult> {
  const parsed = await parseOpenApi(filePath, fetchOptions);
  const tools = normalizeOpenApi(parsed.document);
  const activeRules = filterRules(defaultRules, config);
  let findings = runRules(tools, activeRules);
  findings = overrideSeverities(findings, config);
  findings = suppressIgnoredFindings(findings, tools);
  const toolRisks = classifyToolRisks(tools);

  return {
    input: {
      filePath: parsed.filePath,
      title: parsed.metadata.title,
      version: parsed.metadata.version,
    },
    summary: buildSummary(tools, findings, toolRisks),
    scores: calculateScores(findings, tools.length),
    tools: toolRisks,
    findings,
  };
}

function buildSummary(
  tools: NormalizedTool[],
  findings: Finding[],
  toolRisks: ToolRiskSummary[],
): AnalysisResult['summary'] {
  return {
    totalTools: tools.length,
    readOnlyTools: tools.filter((tool) => isReadOnlyMethod(tool.method)).length,
    mutatingTools: tools.filter((tool) => !isReadOnlyMethod(tool.method)).length,
    destructiveTools: tools.filter((tool) => tool.method === 'DELETE').length,
    highRiskTools: toolRisks.filter(
      (toolRisk) => toolRisk.risk === 'high' || toolRisk.risk === 'critical',
    ).length,
    findingCounts: {
      info: findings.filter((finding) => finding.severity === 'info').length,
      warning: findings.filter((finding) => finding.severity === 'warning').length,
      error: findings.filter((finding) => finding.severity === 'error').length,
    },
  };
}

function isReadOnlyMethod(method: NormalizedTool['method']): boolean {
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
}

function filterRules(rules: Rule[], config?: ToolSafeConfig): Rule[] {
  const ruleOverrides = config?.rules;
  if (!ruleOverrides) {
    return rules;
  }

  return rules.filter((rule) => ruleOverrides[rule.id] !== 'off');
}

function overrideSeverities(findings: Finding[], config?: ToolSafeConfig): Finding[] {
  const ruleOverrides = config?.rules;
  if (!ruleOverrides) {
    return findings;
  }

  return findings.map((finding) => {
    const override = ruleOverrides[finding.ruleId];

    if (override && override !== 'off') {
      return { ...finding, severity: override };
    }

    return finding;
  });
}
