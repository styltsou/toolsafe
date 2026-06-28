import type { NormalizedTool } from '@/core/types';
import { isObject } from '@/core/objects';

/**
 * Returns lowercased searchable text for heuristic rules.
 *
 * ToolSafe v0 deliberately uses shallow, explainable matching instead of
 * trying to infer full API semantics.
 */
export function getOperationSearchText(tool: NormalizedTool): string {
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

/**
 * Returns lowercased operation intent text without long-form description prose.
 *
 * Rules that infer operation intent should prefer this over
 * `getOperationSearchText()` to avoid matching incidental words in docs.
 */
export function getOperationIntentText(tool: NormalizedTool): string {
  return [tool.id, tool.operationId, tool.name, tool.method, tool.path, tool.summary, ...tool.tags]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
}

export function hasOperationIntentKeyword(
  tool: NormalizedTool,
  keywords: readonly string[],
): boolean {
  const tokens = getOperationIntentTokens(tool);

  return keywords.some((keyword) => tokens.has(keyword.toLowerCase()));
}

export function hasOperationExtension(tool: NormalizedTool, names: readonly string[]): boolean {
  if (!isObject(tool.operation)) {
    return false;
  }

  return names.some((name) => Object.hasOwn(tool.operation as Record<string, unknown>, name));
}

function getOperationIntentTokens(tool: NormalizedTool): Set<string> {
  return new Set(
    [
      tool.id,
      tool.operationId,
      tool.name,
      tool.method,
      tool.path,
      tool.summary,
      ...tool.tags,
    ].flatMap((value) => (typeof value === 'string' ? tokenizeIntent(value) : [])),
  );
}

function tokenizeIntent(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}
