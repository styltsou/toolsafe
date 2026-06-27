import type { Rule } from '@/core/types';
import { getResponseSchemaProperties } from '@/core/schema';
import { matchesNormalizedName } from '@/core/strings';
import { createFinding } from '@/rules/findings';

const SENSITIVE_FIELD_NAMES = [
  'password',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'secret',
  'apiKey',
  'api_key',
  'credential',
  'credentials',
  'ssn',
  'socialSecurityNumber',
  'social_security_number',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
];

/**
 * Flags response schemas that expose obviously sensitive top-level fields.
 */
export const sensitiveResponseFieldsRule: Rule = {
  id: 'schema/sensitive-response-fields',
  name: 'Sensitive response fields should be reviewed',
  description:
    'Flags response schemas with sensitive top-level fields such as tokens, secrets, credentials, or payment identifiers.',
  category: 'schema',
  defaultSeverity: 'warning',
  check: ({ tool }) => {
    const sensitiveField = getResponseSchemaProperties(tool).find((property) =>
      matchesNormalizedName(property.name, SENSITIVE_FIELD_NAMES),
    );

    if (!sensitiveField) {
      return [];
    }

    return [
      createFinding(sensitiveResponseFieldsRule, tool, {
        message: `Response schema exposes sensitive field '${sensitiveField.name}'.`,
        recommendation:
          'Redact sensitive fields by default or document why they are safe for agent-facing output.',
        evidence: [`Sensitive response field: ${sensitiveField.name}`],
      }),
    ];
  },
};
