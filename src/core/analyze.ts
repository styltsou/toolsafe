import { parseOpenApi } from '@/parsers/openapi';
import { runRules } from '@/rules';
import { normalizeOpenApi } from '@/core/normalize';
import { classifyToolRisks } from '@/core/risk';
import { calculateScores } from '@/core/scoring';
import type { AnalysisResult, Finding, NormalizedTool, ToolRiskSummary } from '@/core/types';

/**
 * Runs ToolSafe's complete deterministic analysis pipeline for one local file.
 *
 * This function is the core boundary that CLI commands and report generators
 * should call. Keeping parsing, normalization, rules, risk, and scoring here
 * prevents later outputs from each assembling slightly different results.
 */
export async function analyzeOpenApi(filePath: string): Promise<AnalysisResult> {
  const parsed = await parseOpenApi(filePath);
  const tools = normalizeOpenApi(parsed.document);
  const findings = runRules(tools);
  const toolRisks = classifyToolRisks(tools);

  return {
    input: {
      filePath: parsed.filePath,
      title: parsed.metadata.title,
      version: parsed.metadata.version,
    },
    summary: buildSummary(tools, findings, toolRisks),
    scores: calculateScores(findings),
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
