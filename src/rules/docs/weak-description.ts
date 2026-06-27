import type { Rule } from '@/core/types';
import { createFinding } from '@/rules/findings';

const WEAK_PATTERNS = [
  'todo',
  'placeholder',
  'description',
  'operation',
  'endpoint',
  'api call',
  'to be implemented',
  'tbd',
  'coming soon',
  'not implemented',
];

const MIN_DESCRIPTION_LENGTH = 20;

/**
 * Flags descriptions that are too short or contain generic filler text.
 */
export const weakDescriptionRule: Rule = {
  id: 'docs/weak-description',
  name: 'Weak operation description',
  description: 'Flags operations with descriptions that are too short or generic.',
  category: 'docs',
  defaultSeverity: 'info',
  check: ({ tool }) => {
    const text = tool.description ?? tool.summary ?? '';

    if (text.length === 0) {
      return [];
    }

    if (text.length < MIN_DESCRIPTION_LENGTH) {
      return [
        createFinding(weakDescriptionRule, tool, {
          message: 'Description is too short to be useful for agent tool selection.',
          recommendation:
            'Expand the description to clearly explain what the operation does and when to use it.',
          evidence: [`Description length: ${text.length} characters`],
        }),
      ];
    }

    const lower = text.toLowerCase();

    for (const pattern of WEAK_PATTERNS) {
      if (lower.includes(pattern)) {
        return [
          createFinding(weakDescriptionRule, tool, {
            message: 'Description contains generic or placeholder text.',
            recommendation:
              'Replace generic text with a meaningful description of the operation behaviour.',
            evidence: [`Matches weak pattern: "${pattern}"`],
          }),
        ];
      }
    }

    return [];
  },
};
