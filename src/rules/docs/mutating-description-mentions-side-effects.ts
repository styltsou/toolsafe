import type { Rule } from '@/core/types';
import { includesAny } from '@/core/strings';
import { createFinding } from '@/rules/findings';
import { getOperationSearchText } from '@/rules/helpers';

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;

const SIDE_EFFECT_VERBS = [
  'creates',
  'creates a',
  'creates an',
  'updates',
  'updates a',
  'updates an',
  'deletes',
  'deletes a',
  'deletes an',
  'removes',
  'removes a',
  'removes an',
  'modifies',
  'modifies a',
  'modifies an',
  'changes',
  'inserts',
  'registers',
  'generates',
  'produces',
  'triggers',
  'sends',
  'charges',
  'transfers',
  'publishes',
  'submits',
  'cancels',
  'revokes',
  'terminates',
];

/**
 * Flags mutating operations whose descriptions do not mention what
 * side effects the operation has on the system.
 */
export const mutatingDescriptionMentionsSideEffectsRule: Rule = {
  id: 'docs/mutating-description-mentions-side-effects',
  name: 'Mutating description mentions side effects',
  description:
    'Flags mutating operations whose descriptions lack mention of side effects or state changes.',
  category: 'docs',
  defaultSeverity: 'warning',
  check: ({ tool }) => {
    if (!MUTATING_METHODS.includes(tool.method as typeof MUTATING_METHODS[number])) {
      return [];
    }

    const searchText = getOperationSearchText(tool);

    if (includesAny(searchText, SIDE_EFFECT_VERBS)) {
      return [];
    }

    return [
      createFinding(mutatingDescriptionMentionsSideEffectsRule, tool, {
        message:
          'Mutating operation description does not mention side effects or state changes.',
        recommendation:
          'Update the description to clearly state what side effects this operation has (e.g., "Creates a new user account" rather than just "Create user").',
        evidence: [
          `Method: ${tool.method}`,
          tool.description
            ? `Description: "${tool.description}"`
            : 'No description provided',
        ],
      }),
    ];
  },
};
