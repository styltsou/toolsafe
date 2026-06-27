import type { NormalizedTool, RiskLevel, ToolRiskSummary } from '@/core/types';

const DESTRUCTIVE_KEYWORDS = [
  'delete',
  'remove',
  'destroy',
  'revoke',
  'cancel',
  'terminate',
  'drop',
  'purge',
  'erase',
  'deactivate',
  'disable',
  'ban',
  'suspend',
];

const HIGH_RISK_KEYWORDS = [
  ...DESTRUCTIVE_KEYWORDS,
  'payment',
  'charge',
  'refund',
  'transfer',
  'payout',
  'invoice',
  'billing',
  'subscription',
  'credit',
  'debit',
  'bank',
  'email',
  'sms',
  'message',
  'notify',
  'notification',
  'invite',
  'webhook',
  'publish',
  'send',
  'broadcast',
  'permission',
  'role',
  'admin',
  'owner',
  'scope',
  'token',
  'secret',
  'key',
  'password',
  'credential',
  'api_key',
  'apikey',
  'execute',
  'run',
  'shell',
  'command',
  'script',
  'deploy',
  'release',
  'build',
  'job',
  'workflow',
  'pipeline',
];

/**
 * Classifies a normalized operation with deterministic method and keyword heuristics.
 *
 * This is intentionally explainable rather than clever. Every risk increase
 * adds a reason that later reports and policy generation can show to users.
 */
export function classifyToolRisk(tool: NormalizedTool): ToolRiskSummary {
  const reasons: string[] = [];
  let risk = baseMethodRisk(tool, reasons);
  const matchedKeywords = getMatchedKeywords(getOperationRiskText(tool), HIGH_RISK_KEYWORDS);

  if (matchedKeywords.length > 0 && riskRank(risk) < riskRank('high')) {
    risk = 'high';
    reasons.push(`Risk keyword: ${matchedKeywords[0]}`);
  }

  return {
    toolId: tool.id,
    toolName: tool.name,
    method: tool.method,
    path: tool.path,
    risk,
    reasons,
  };
}

export function classifyToolRisks(tools: NormalizedTool[]): ToolRiskSummary[] {
  return tools.map(classifyToolRisk);
}

function baseMethodRisk(tool: NormalizedTool, reasons: string[]): RiskLevel {
  switch (tool.method) {
    case 'GET':
    case 'HEAD':
    case 'OPTIONS':
      reasons.push(`HTTP method ${tool.method} is generally read-only`);
      return 'low';
    case 'DELETE':
      reasons.push('HTTP method DELETE is destructive');
      return 'high';
    case 'POST':
    case 'PUT':
    case 'PATCH':
      reasons.push(`HTTP method ${tool.method} can mutate state`);
      return 'medium';
  }
}

function getOperationRiskText(tool: NormalizedTool): string {
  return [
    tool.id,
    tool.operationId,
    tool.name,
    tool.method,
    tool.path,
    tool.summary,
    tool.description,
    ...tool.tags,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
}

function getMatchedKeywords(text: string, keywords: readonly string[]): string[] {
  return keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
}

function riskRank(risk: RiskLevel): number {
  switch (risk) {
    case 'low':
      return 0;
    case 'medium':
      return 1;
    case 'high':
      return 2;
    case 'critical':
      return 3;
  }
}
