import type { Rule } from '@/core/types';
import { createFinding } from '@/rules/findings';

/**
 * Flags operations with no human-readable purpose text.
 *
 * OpenAPI `summary` and `description` are often copied into generated tool
 * descriptions, so missing text directly affects agent tool selection.
 */
export const missingDescriptionRule: Rule = {
  id: 'docs/missing-description',
  name: 'Missing operation description',
  description: 'Flags operations with neither summary nor description.',
  category: 'docs',
  defaultSeverity: 'warning',
  check: ({ tool }) => {
    if (hasText(tool.summary) || hasText(tool.description)) {
      return [];
    }

    return [
      createFinding(missingDescriptionRule, tool, {
        message: 'Operation has no summary or description.',
        recommendation:
          'Add a clear operation summary and description so agents can choose this tool correctly.',
        evidence: ['Missing summary', 'Missing description'],
      }),
    ];
  },
};

function hasText(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}
