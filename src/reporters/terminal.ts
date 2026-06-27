import pc from 'picocolors';
import type { AnalysisResult, Finding, FindingSeverity, RiskLevel } from '@/core/types';

const CATEGORY_KEYS: { key: keyof AnalysisResult['scores']; label: string }[] = [
  { key: 'safety', label: 'Safety' },
  { key: 'schema', label: 'Schema' },
  { key: 'docs', label: 'Docs' },
  { key: 'errors', label: 'Errors' },
  { key: 'agentUsability', label: 'Agent usability' },
  { key: 'auth', label: 'Auth' },
];

const FINDING_GROUPS: { severity: FindingSeverity; title: string }[] = [
  { severity: 'error', title: 'Errors' },
  { severity: 'warning', title: 'Warnings' },
  { severity: 'info', title: 'Info' },
];

export function renderTerminalReport(result: AnalysisResult): string {
  const lines: string[] = [];

  lines.push(pc.bold('ToolSafe Agent-Readiness Report'));
  lines.push('');
  lines.push(`Input: ${result.input.filePath}`);

  if (result.input.title || result.input.version) {
    lines.push(`API: ${[result.input.title, result.input.version].filter(Boolean).join(' ')}`);
  }

  lines.push(`Operations analyzed: ${result.summary.totalTools}`);
  lines.push(`Overall score: ${formatScore(result.scores.overall)}`);
  lines.push(
    `Findings: ${result.summary.findingCounts.error} error, ${result.summary.findingCounts.warning} warning, ${result.summary.findingCounts.info} info`,
  );

  lines.push('');
  lines.push(pc.bold('Score breakdown'));

  for (const cat of CATEGORY_KEYS) {
    const score = result.scores[cat.key];

    if (score !== undefined) {
      lines.push(`  ${formatScoreSmall(score)} ${cat.label}`);
    }
  }

  const highRiskTools = result.tools.filter(
    (tool) => tool.risk === 'high' || tool.risk === 'critical',
  );

  if (highRiskTools.length > 0) {
    lines.push('');
    lines.push(pc.bold('High-risk operations'));

    for (const tool of highRiskTools) {
      lines.push(`  ${formatRisk(tool.risk)} ${pc.dim(tool.method)} ${tool.path} (${tool.toolName})`);

      for (const reason of tool.reasons.slice(0, 2)) {
        lines.push(`       ${pc.dim(reason)}`);
      }
    }
  }

  for (const group of FINDING_GROUPS) {
    const findings = result.findings.filter((finding) => finding.severity === group.severity);

    if (findings.length === 0) {
      continue;
    }

    lines.push('');
    lines.push(pc.bold(group.title));

    for (const finding of findings) {
      lines.push(formatFinding(finding));
      lines.push(`       ${pc.dim(finding.message)}`);
      lines.push(`       ${pc.dim(`Recommendation: ${finding.recommendation}`)}`);

      for (const evidence of finding.evidence ?? []) {
        lines.push(`       ${pc.dim(`Evidence: ${evidence}`)}`);
      }
    }
  }

  if (result.findings.length === 0) {
    lines.push('');
    lines.push(pc.green('No findings.'));
  }

  return `${lines.join('\n')}\n`;
}

function formatFinding(finding: Finding): string {
  return `  ${formatSeverity(finding.severity)} ${pc.dim(finding.method)} ${finding.path} (${finding.ruleId})`;
}

function formatSeverity(severity: FindingSeverity): string {
  switch (severity) {
    case 'error':
      return pc.red('ERROR');
    case 'warning':
      return pc.yellow('WARN ');
    case 'info':
      return pc.blue('INFO ');
  }
}

function formatRisk(risk: RiskLevel): string {
  switch (risk) {
    case 'critical':
      return pc.red('CRITICAL');
    case 'high':
      return pc.red('HIGH');
    case 'medium':
      return pc.yellow('MEDIUM');
    case 'low':
      return pc.green('LOW');
  }
}

function formatScore(score: number): string {
  const text = `${score}/100`;

  if (score < 60) {
    return pc.red(text);
  }

  if (score < 80) {
    return pc.yellow(text);
  }

  return pc.green(text);
}

function formatScoreSmall(score: number): string {
  const text = `${String(score).padStart(3)}/100`;

  if (score < 60) {
    return pc.red(text);
  }

  if (score < 80) {
    return pc.yellow(text);
  }

  return pc.green(text);
}
