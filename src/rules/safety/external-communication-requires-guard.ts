import type { HttpMethod, Rule } from '@/core/types';
import { hasAnyInputField } from '@/core/schema';
import { createFinding } from '@/rules/findings';
import { hasOperationExtension, hasOperationIntentKeyword } from '@/rules/helpers';

const MUTATING_METHODS = new Set<HttpMethod>(['POST', 'PUT', 'PATCH', 'DELETE']);

const HIGH_CONFIDENCE_EXTERNAL_KEYWORDS = [
  'email',
  'emails',
  'sms',
  'notify',
  'notification',
  'notifications',
  'invite',
  'invites',
  'webhook',
  'webhooks',
];

const AMBIGUOUS_EXTERNAL_KEYWORDS = ['message', 'messages', 'publish', 'send', 'broadcast'];

const GUARD_FIELDS = [
  'confirm',
  'confirmation',
  'confirmationToken',
  'confirmation_token',
  'confirmed',
  'requireConfirmation',
  'recipientConfirmed',
  'recipient_confirmed',
];

const RECIPIENT_FIELDS = [
  'to',
  'recipient',
  'recipients',
  'recipientEmail',
  'recipient_email',
  'email',
  'emailAddress',
  'email_address',
  'phone',
  'phoneNumber',
  'phone_number',
  'address',
];

const GUARD_EXTENSIONS = [
  'x-agent-guard',
  'x-toolsafe-guard',
  'x-requires-confirmation',
  'x-confirmation-required',
];

/**
 * Flags operations that can contact external recipients without a guard signal.
 */
export const externalCommunicationRequiresGuardRule: Rule = {
  id: 'safety/external-communication-requires-guard',
  name: 'External communication should require guard signal',
  description:
    'Flags mutating email, SMS, notification, invite, webhook, or broadcast operations without confirmation or guard metadata.',
  category: 'safety',
  defaultSeverity: 'warning',
  check: ({ tool }) => {
    const isExternalCommunication =
      MUTATING_METHODS.has(tool.method) &&
      (hasOperationIntentKeyword(tool, HIGH_CONFIDENCE_EXTERNAL_KEYWORDS) ||
        (hasOperationIntentKeyword(tool, AMBIGUOUS_EXTERNAL_KEYWORDS) &&
          hasAnyInputField(tool, RECIPIENT_FIELDS)));

    if (!isExternalCommunication) {
      return [];
    }

    const hasGuardSignal =
      hasAnyInputField(tool, GUARD_FIELDS) || hasOperationExtension(tool, GUARD_EXTENSIONS);

    if (hasGuardSignal) {
      return [];
    }

    return [
      createFinding(externalCommunicationRequiresGuardRule, tool, {
        message:
          'External communication operation does not declare a confirmation or guard signal.',
        recommendation:
          'Add confirmation input or guard metadata before exposing this operation to autonomous agents.',
        evidence: [`HTTP method ${tool.method}`, 'External communication keyword'],
      }),
    ];
  },
};
