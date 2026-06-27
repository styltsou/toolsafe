import type { Rule } from '@/core/types';
import { isObject } from '@/core/objects';
import { matchesNormalizedName } from '@/core/strings';
import { createFinding } from '@/rules/findings';

const DANGEROUS_SCOPES = [
  'admin',
  '*',
  'all',
  'full_access',
  'full-access',
  'fullaccess',
  'root',
  'superuser',
  'super_user',
  'write',
];

/**
 * Flags security requirements that use overly broad scopes.
 *
 * Broad or wildcard scopes give agents more authority than needed
 * for a single operation and make it harder to apply least-privilege
 * access control.
 */
export const dangerousAuthScopeRule: Rule = {
  id: 'auth/dangerous-auth-scope',
  name: 'Dangerous auth scope',
  description: 'Flags security requirements with overly broad or dangerous scopes.',
  category: 'auth',
  defaultSeverity: 'warning',
  check: ({ tool }) => {
    if (!tool.security || tool.security.length === 0) {
      return [];
    }

    const foundScopes: string[] = [];

    for (const requirement of tool.security) {
      if (!isObject(requirement)) {
        continue;
      }

      for (const value of Object.values(requirement)) {
        if (!Array.isArray(value)) {
          continue;
        }

        for (const scope of value) {
          if (typeof scope === 'string' && matchesNormalizedName(scope, DANGEROUS_SCOPES)) {
            foundScopes.push(scope);
          }
        }
      }
    }

    if (foundScopes.length === 0) {
      return [];
    }

    return [
      createFinding(dangerousAuthScopeRule, tool, {
        message: `Operation uses overly broad auth scope(s): ${foundScopes.join(', ')}.`,
        recommendation:
          'Replace broad scopes with fine-grained, operation-specific scopes (e.g. "users:read" instead of "admin").',
        evidence: foundScopes.map((scope) => `Scope: ${scope}`),
      }),
    ];
  },
};
