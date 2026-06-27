import { stringify as stringifyYaml } from 'yaml';
import type { AnalysisResult, Finding } from '@/core/types';

export type GeneratedSource = {
  filePath: string;
  title?: string | undefined;
  version?: string | undefined;
};

export function buildGeneratedSource(result: AnalysisResult): GeneratedSource {
  return {
    filePath: result.input.filePath,
    title: result.input.title,
    version: result.input.version,
  };
}

export function renderYaml(value: unknown): string {
  return stringifyYaml(value);
}

export function groupFindingsByToolId(findings: Finding[]): Map<string, Finding[]> {
  const grouped = new Map<string, Finding[]>();

  for (const finding of findings) {
    grouped.set(finding.toolId, [...(grouped.get(finding.toolId) ?? []), finding]);
  }

  return grouped;
}
