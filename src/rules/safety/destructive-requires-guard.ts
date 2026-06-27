import type { Rule } from '@/core/types';
import { hasAnyInputField } from '@/core/schema';
import { includesAny } from '@/core/strings';
import { createFinding } from '@/rules/findings';
import { getOperationSearchText, hasOperationExtension } from '@/rules/helpers';

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

const GUARD_FIELDS = [
  'confirm',
  'confirmation',
  'confirmationToken',
  'confirmation_token',
  'confirmed',
  'requireConfirmation',
];

const GUARD_EXTENSIONS = [
  'x-agent-guard',
  'x-toolsafe-guard',
  'x-requires-confirmation',
  'x-confirmation-required',
];

/**
 * Flags destructive operations when the OpenAPI contract has no explicit
 * machine-readable guard signal for downstream tool generators to preserve.
 */
export const destructiveRequiresGuardRule: Rule = {
  id: 'safety/destructive-requires-guard',
  name: 'Destructive operation should declare an explicit guard signal',
  description:
    'Flags DELETE/destructive operations that do not expose confirmation fields or guard metadata.',
  category: 'safety',
  defaultSeverity: 'error',
  check: ({ tool }) => {
    const searchText = getOperationSearchText(tool);
    const isDestructive = tool.method === 'DELETE' || includesAny(searchText, DESTRUCTIVE_KEYWORDS);

    if (!isDestructive) {
      return [];
    }

    const hasGuardSignal =
      hasAnyInputField(tool, GUARD_FIELDS) || hasOperationExtension(tool, GUARD_EXTENSIONS);

    if (hasGuardSignal) {
      return [];
    }

    const evidence = tool.method === 'DELETE' ? ['HTTP method DELETE'] : ['Destructive keyword'];

    return [
      createFinding(destructiveRequiresGuardRule, tool, {
        message:
          'Destructive operation does not declare an explicit agent guard or confirmation signal in the API contract.',
        recommendation:
          'Add a confirmation field, a vendor extension such as x-agent-guard, or a generated guard policy before exposing this operation to autonomous agents.',
        evidence,
      }),
    ];
  },
};
