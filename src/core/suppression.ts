import type { Finding, NormalizedTool } from '@/core/types';
import { isObject } from '@/core/objects';

const IGNORE_EXTENSION = 'x-toolsafe-ignore';
const IGNORE_ALL_EXTENSION = 'x-toolsafe-ignore-all';

export function getIgnoredRuleIds(tool: NormalizedTool): string[] {
  if (!isObject(tool.rawOperation)) {
    return [];
  }

  const value = (tool.rawOperation as Record<string, unknown>)[IGNORE_EXTENSION];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((id): id is string => typeof id === 'string');
}

export function isAllIgnored(tool: NormalizedTool): boolean {
  if (!isObject(tool.rawOperation)) {
    return false;
  }

  return (tool.rawOperation as Record<string, unknown>)[IGNORE_ALL_EXTENSION] === true;
}

export function suppressIgnoredFindings(findings: Finding[], tools: NormalizedTool[]): Finding[] {
  const allIgnored = new Set<string>();
  const specificIgnored = new Map<string, Set<string>>();

  for (const tool of tools) {
    if (isAllIgnored(tool)) {
      allIgnored.add(tool.id);
    } else {
      const ids = getIgnoredRuleIds(tool);
      if (ids.length > 0) {
        specificIgnored.set(tool.id, new Set(ids));
      }
    }
  }

  if (allIgnored.size === 0 && specificIgnored.size === 0) {
    return findings;
  }

  return findings.filter((finding) => {
    if (allIgnored.has(finding.toolId)) {
      return false;
    }

    const specific = specificIgnored.get(finding.toolId);
    return specific ? !specific.has(finding.ruleId) : true;
  });
}
