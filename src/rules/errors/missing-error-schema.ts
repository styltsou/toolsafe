import type { Rule } from '@/core/types';
import { createFinding } from '@/rules/findings';

/**
 * Flags operations that do not describe structured 4xx/5xx response bodies.
 *
 * Agents can recover more safely when failures have stable machine-readable
 * fields such as error codes and messages.
 */
export const missingErrorSchemaRule: Rule = {
  id: 'errors/missing-error-schema',
  name: 'Missing structured error schema',
  description: 'Flags operations without any 4xx or 5xx response schema.',
  category: 'errors',
  defaultSeverity: 'warning',
  check: ({ tool }) => {
    const hasStructuredErrorResponse = tool.responses.some(
      (response) => isErrorStatus(response.statusCode) && response.schema !== undefined,
    );

    if (hasStructuredErrorResponse) {
      return [];
    }

    return [
      createFinding(missingErrorSchemaRule, tool, {
        message: 'Operation does not define a structured 4xx or 5xx error response schema.',
        recommendation:
          'Define structured error responses with stable error codes and messages so agents can recover safely.',
        evidence: ['No 4xx/5xx response with schema'],
      }),
    ];
  },
};

function isErrorStatus(statusCode: string): boolean {
  return /^[45]\d\d$/.test(statusCode);
}
