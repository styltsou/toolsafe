import type { AnalysisResult } from '@/core/types';

/**
 * Stable pretty JSON reporter used by CLI output and later report generation.
 */
export function renderJsonReport(result: AnalysisResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}
