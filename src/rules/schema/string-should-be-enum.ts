import type { Rule } from '@/core/types';
import { getInputSchemaProperties, hasEnum, hasSchemaKeyword, isStringSchema } from '@/core/schema';
import { matchesNormalizedName } from '@/core/strings';
import { createFinding } from '@/rules/findings';

const ENUM_LIKE_NAMES = [
  'status',
  'state',
  'type',
  'role',
  'mode',
  'sort',
  'order',
  'priority',
  'category',
  'level',
];

/**
 * Flags likely constrained string inputs that lack enum values.
 */
export const stringShouldBeEnumRule: Rule = {
  id: 'schema/string-should-be-enum',
  name: 'Constrained strings should use enums',
  description:
    'Flags likely constrained string inputs such as role, status, or mode without enum values.',
  category: 'schema',
  defaultSeverity: 'warning',
  check: ({ tool }) => {
    const unconstrainedString = getInputSchemaProperties(tool).find(
      (property) =>
        isStringSchema(property.schema) &&
        !hasEnum(property.schema) &&
        !hasSchemaKeyword(property.schema, ['pattern']) &&
        matchesNormalizedName(property.name, ENUM_LIKE_NAMES),
    );

    if (!unconstrainedString) {
      return [];
    }

    return [
      createFinding(stringShouldBeEnumRule, tool, {
        message: `String input '${unconstrainedString.name}' appears constrained but has no enum.`,
        recommendation:
          'Add enum values so agents can choose valid inputs without guessing API-specific strings.',
        evidence: [`String input: ${unconstrainedString.name}`],
      }),
    ];
  },
};
