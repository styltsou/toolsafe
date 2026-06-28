import type { Rule } from '@/core/types';
import { includesAny } from '@/core/strings';
import { createFinding } from '@/rules/findings';

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;

const SIDE_EFFECT_VERBS = [
  'create',
  'creates',
  'creates a',
  'creates an',
  'update',
  'updates',
  'updates a',
  'updates an',
  'delete',
  'deletes',
  'deletes a',
  'deletes an',
  'remove',
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
  'cancel',
  'cancels',
  'revoke',
  'revokes',
  'terminate',
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
    if (!MUTATING_METHODS.includes(tool.method as (typeof MUTATING_METHODS)[number])) {
      return [];
    }

    const documentationText = [tool.summary, tool.description]
      .filter((value): value is string => typeof value === 'string')
      .join(' ')
      .toLowerCase();

    if (includesAny(documentationText, SIDE_EFFECT_VERBS)) {
      return [];
    }

    return [
      createFinding(mutatingDescriptionMentionsSideEffectsRule, tool, {
        message: 'Mutating operation description does not mention side effects or state changes.',
        recommendation:
          'Update the description to clearly state what side effects this operation has (e.g., "Creates a new user account" rather than just "Create user").',
        evidence: [
          `Method: ${tool.method}`,
          tool.description ? `Description: "${tool.description}"` : 'No description provided',
        ],
      }),
    ];
  },
};
