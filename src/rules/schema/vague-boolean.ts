import type { Rule } from '@/core/types';
import { getInputSchemaProperties, isBooleanSchema } from '@/core/schema';
import { matchesNormalizedName } from '@/core/strings';
import { createFinding } from '@/rules/findings';

const VAGUE_BOOLEAN_NAMES = [
  'flag',
  'force',
  'override',
  'enabled',
  'disabled',
  'active',
  'allow',
  'apply',
  'run',
  'execute',
];

/**
 * Flags boolean inputs whose names are likely ambiguous for agents.
 */
export const vagueBooleanRule: Rule = {
  id: 'schema/vague-boolean',
  name: 'Boolean inputs should be explicit',
  description: 'Flags boolean parameters or body fields with vague names such as force or flag.',
  category: 'schema',
  defaultSeverity: 'warning',
  check: ({ tool }) => {
    const vagueBoolean = getInputSchemaProperties(tool).find(
      (property) =>
        isBooleanSchema(property.schema) &&
        matchesNormalizedName(property.name, VAGUE_BOOLEAN_NAMES),
    );

    if (!vagueBoolean) {
      return [];
    }

    return [
      createFinding(vagueBooleanRule, tool, {
        message: `Boolean input '${vagueBoolean.name}' is too vague for reliable agent use.`,
        recommendation:
          'Rename vague booleans to describe the exact behavior they enable, or replace them with a constrained enum.',
        evidence: [`Boolean input: ${vagueBoolean.name}`],
      }),
    ];
  },
};
