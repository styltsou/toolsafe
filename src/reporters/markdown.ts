import type { AnalysisResult, Finding, FindingSeverity } from '@/core/types';

const FINDING_GROUPS: { severity: FindingSeverity; title: string }[] = [
  { severity: 'error', title: 'Errors' },
  { severity: 'warning', title: 'Warnings' },
  { severity: 'info', title: 'Info' },
];

/**
 * Concise PR-friendly Markdown report.
 */
export function renderMarkdownReport(result: AnalysisResult): string {
  const lines: string[] = [
    '# ToolSafe Agent-Readiness Report',
    '',
    `Input: \`${result.input.filePath}\``,
    '',
  ];

  if (result.input.title || result.input.version) {
    lines.push(`API: ${[result.input.title, result.input.version].filter(Boolean).join(' ')}`);
    lines.push('');
  }

  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  lines.push(`| Operations analyzed | ${result.summary.totalTools} |`);
  lines.push(`| Read-only operations | ${result.summary.readOnlyTools} |`);
  lines.push(`| Mutating operations | ${result.summary.mutatingTools} |`);
  lines.push(`| Destructive operations | ${result.summary.destructiveTools} |`);
  lines.push(`| High-risk operations | ${result.summary.highRiskTools} |`);
  lines.push(`| Errors | ${result.summary.findingCounts.error} |`);
  lines.push(`| Warnings | ${result.summary.findingCounts.warning} |`);
  lines.push(`| Info | ${result.summary.findingCounts.info} |`);
  lines.push('');
  lines.push('## Scores');
  lines.push('');
  lines.push('| Category | Score |');
  lines.push('| --- | ---: |');
  lines.push(`| Overall | ${result.scores.overall}/100 |`);
  lines.push(`| Safety | ${result.scores.safety}/100 |`);
  lines.push(`| Schema | ${result.scores.schema}/100 |`);
  lines.push(`| Docs | ${result.scores.docs}/100 |`);
  lines.push(`| Errors | ${result.scores.errors}/100 |`);
  lines.push(`| Agent usability | ${result.scores.agentUsability}/100 |`);
  lines.push(`| Auth | ${result.scores.auth}/100 |`);

  const highRiskTools = result.tools.filter(
    (tool) => tool.risk === 'high' || tool.risk === 'critical',
  );

  if (highRiskTools.length > 0) {
    lines.push('');
    lines.push('## High-Risk Operations');
    lines.push('');
    lines.push('| Risk | Operation | Reasons |');
    lines.push('| --- | --- | --- |');

    for (const tool of highRiskTools) {
      lines.push(
        `| ${tool.risk} | \`${tool.method} ${escapeMarkdownTableCell(tool.path)}\` (${escapeMarkdownTableCell(tool.toolName)}) | ${escapeMarkdownTableCell(tool.reasons.join('; '))} |`,
      );
    }
  }

  lines.push('');
  lines.push('## Findings');

  if (result.findings.length === 0) {
    lines.push('');
    lines.push('No findings.');
    lines.push('');
    return lines.join('\n');
  }

  for (const group of FINDING_GROUPS) {
    const findings = result.findings.filter((finding) => finding.severity === group.severity);

    if (findings.length === 0) {
      continue;
    }

    lines.push('');
    lines.push(`### ${group.title}`);
    lines.push('');

    findings.forEach((finding, index) => {
      if (index > 0) {
        lines.push('');
      }

      lines.push(formatFinding(finding));
    });
  }

  return `${lines.join('\n')}\n`;
}

function formatFinding(finding: Finding): string {
  const lines = [
    `- **${finding.ruleId}**: \`${finding.method} ${finding.path}\``,
    `  - ${finding.message}`,
    `  - Recommendation: ${finding.recommendation}`,
  ];

  if (finding.evidence?.length) {
    lines.push(`  - Evidence: ${finding.evidence.join('; ')}`);
  }

  return lines.join('\n');
}

function escapeMarkdownTableCell(value: string): string {
  return value.replaceAll('|', '\\|');
}
