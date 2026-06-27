import type { AnalysisResult, Finding, FindingSeverity } from '@/core/types';

const FINDING_GROUPS: { severity: FindingSeverity; title: string }[] = [
  { severity: 'error', title: 'Errors' },
  { severity: 'warning', title: 'Warnings' },
  { severity: 'info', title: 'Info' },
];

const SEVERITY_COLORS: Record<FindingSeverity, string> = {
  error: '#dc2626',
  warning: '#f59e0b',
  info: '#3b82f6',
};

const RISK_COLORS: Record<string, string> = {
  critical: '#7c3aed',
  high: '#dc2626',
  medium: '#f59e0b',
  low: '#22c55e',
};

export function renderHtmlReport(result: AnalysisResult): string {
  const css = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 960px; margin: 0 auto; padding: 2rem; color: #1f2937; background: #f9fafb; }
    h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
    h2 { font-size: 1.25rem; margin: 1.5rem 0 0.75rem; padding-bottom: 0.25rem; border-bottom: 2px solid #e5e7eb; }
    h3 { font-size: 1rem; margin: 1rem 0 0.5rem; color: #374151; }
    .subtitle { color: #6b7280; font-size: 0.875rem; margin-bottom: 1.5rem; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
    th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb; font-size: 0.875rem; }
    th { background: #f3f4f6; font-weight: 600; white-space: nowrap; }
    td:last-child, th:last-child { text-align: right; }
    .finding { margin-bottom: 0.75rem; padding: 0.75rem; border-radius: 6px; border-left: 4px solid; background: #fff; }
    .finding-error { border-color: #dc2626; }
    .finding-warning { border-color: #f59e0b; }
    .finding-info { border-color: #3b82f6; }
    .finding-title { font-weight: 600; font-size: 0.875rem; }
    .finding-meta { color: #6b7280; font-size: 0.8rem; margin: 0.25rem 0; }
    .finding-msg { margin: 0.25rem 0; font-size: 0.875rem; }
    .finding-rec { margin: 0.25rem 0 0; font-size: 0.875rem; color: #374151; }
    .finding-rec::before { content: '→ '; }
    .evidence { margin: 0.25rem 0 0; font-size: 0.8rem; color: #6b7280; }
    .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; color: #fff; }
    .empty { color: #9ca3af; font-style: italic; }
    .no-underline { text-decoration: none; }
  `;

  const severityBadge = (severity: FindingSeverity): string =>
    `<span class="badge" style="background:${SEVERITY_COLORS[severity]}">${severity}</span>`;

  const riskBadge = (risk: string): string =>
    `<span class="badge" style="background:${RISK_COLORS[risk] ?? '#6b7280'}">${risk}</span>`;

  const sections: string[] = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ToolSafe Agent-Readiness Report</title><style>',
    css,
    '</style></head>',
    '<body>',
    '<h1>ToolSafe Agent-Readiness Report</h1>',
    `<p class="subtitle">Input: <code>${escapeHtml(result.input.filePath)}</code>${result.input.title ? ` &mdash; ${escapeHtml([result.input.title, result.input.version].filter(Boolean).join(' '))}` : ''}</p>`,
    '',
    '<h2>Summary</h2>',
    '<table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>',
    row('Operations analyzed', String(result.summary.totalTools)),
    row('Read-only operations', String(result.summary.readOnlyTools)),
    row('Mutating operations', String(result.summary.mutatingTools)),
    row('Destructive operations', String(result.summary.destructiveTools)),
    row('High-risk operations', String(result.summary.highRiskTools)),
    row('Errors', String(result.summary.findingCounts.error)),
    row('Warnings', String(result.summary.findingCounts.warning)),
    row('Info', String(result.summary.findingCounts.info)),
    '</tbody></table>',
    '',
    '<h2>Scores</h2>',
    '<table><thead><tr><th>Category</th><th>Score</th></tr></thead><tbody>',
    row('Overall', `${result.scores.overall}/100`),
    row('Safety', `${result.scores.safety}/100`),
    row('Schema', `${result.scores.schema}/100`),
    row('Docs', `${result.scores.docs}/100`),
    row('Errors', `${result.scores.errors}/100`),
    row('Agent usability', `${result.scores.agentUsability}/100`),
    row('Auth', `${result.scores.auth}/100`),
    '</tbody></table>',
    '',
  ];

  const highRiskTools = result.tools.filter(
    (tool) => tool.risk === 'high' || tool.risk === 'critical',
  );

  if (highRiskTools.length > 0) {
    sections.push('<h2>High-Risk Operations</h2>');
    sections.push(
      '<table><thead><tr><th>Risk</th><th>Operation</th><th>Reasons</th></tr></thead><tbody>',
    );
    for (const tool of highRiskTools) {
      sections.push(
        `<tr><td>${riskBadge(tool.risk)}</td><td><code>${escapeHtml(tool.method)} ${escapeHtml(tool.path)}</code> (${escapeHtml(tool.toolName)})</td><td>${escapeHtml(tool.reasons.join('; '))}</td></tr>`,
      );
    }
    sections.push('</tbody></table>');
  }

  sections.push('<h2>Findings</h2>');

  if (result.findings.length === 0) {
    sections.push('<p class="empty">No findings.</p>');
  } else {
    for (const group of FINDING_GROUPS) {
      const findings = result.findings.filter((f) => f.severity === group.severity);
      if (findings.length === 0) continue;

      sections.push(`<h3>${group.title} (${findings.length})</h3>`);

      for (const finding of findings) {
        sections.push(renderFindingHtml(finding, severityBadge));
      }
    }
  }

  sections.push('</body></html>');

  return sections.join('\n');
}

function renderFindingHtml(
  finding: Finding,
  severityBadge: (s: FindingSeverity) => string,
): string {
  return [
    `<div class="finding finding-${finding.severity}">`,
    `  <div class="finding-title">${severityBadge(finding.severity)} ${escapeHtml(finding.ruleId)}: <code>${escapeHtml(finding.method)} ${escapeHtml(finding.path)}</code></div>`,
    `  <div class="finding-msg">${escapeHtml(finding.message)}</div>`,
    `  <div class="finding-rec">${escapeHtml(finding.recommendation)}</div>`,
    finding.evidence?.length
      ? `  <div class="evidence">Evidence: ${escapeHtml(finding.evidence.join('; '))}</div>`
      : '',
    '</div>',
  ]
    .filter(Boolean)
    .join('\n');
}

function row(label: string, value: string): string {
  return `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
