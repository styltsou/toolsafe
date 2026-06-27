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

export function hasOperationExtension(tool: NormalizedTool, names: readonly string[]): boolean {
  if (!isObject(tool.rawOperation)) {
    return false;
  }

  return names.some((name) => Object.hasOwn(tool.rawOperation as Record<string, unknown>, name));
}
