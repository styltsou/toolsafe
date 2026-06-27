import { describe, expect, test } from 'bun:test';
import type { NormalizedTool } from '@/core/types';
import { normalizeOpenApi } from '@/core/normalize';
import { parseOpenApi } from '@/parsers/openapi';
import {
  batchOperationRequiresLimitRule,
  dangerousAuthScopeRule,
  destructiveRequiresGuardRule,
  externalCommunicationRequiresGuardRule,
  financialRequiresIdempotencyRule,
  listRequiresPaginationRule,
  missingDescriptionRule,
  missingErrorSchemaRule,
  mutatingDescriptionMentionsSideEffectsRule,
  mutatingRequiresDryRunRule,
  runRules,
  sensitiveResponseFieldsRule,
  stringShouldBeEnumRule,
  unconstrainedFileUploadRule,
  vagueBooleanRule,
  weakDescriptionRule,
} from '@/rules';

describe('default rule engine', () => {
  test('returns stable findings for the risky example', async () => {
    const parsed = await parseOpenApi('examples/risky-openapi.yaml');
    const tools = normalizeOpenApi(parsed.document);
    const findings = runRules(tools);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      'safety/destructive-requires-guard',
      'docs/mutating-description-mentions-side-effects',
      'errors/missing-error-schema',
      'safety/external-communication-requires-guard',
      'safety/mutating-requires-dry-run',
      'docs/mutating-description-mentions-side-effects',
      'errors/missing-error-schema',
      'safety/financial-requires-idempotency',
      'safety/mutating-requires-dry-run',
      'errors/missing-error-schema',
      'schema/list-requires-pagination',
      'docs/mutating-description-mentions-side-effects',
      'errors/missing-error-schema',
      'safety/mutating-requires-dry-run',
      'schema/string-should-be-enum',
      'schema/vague-boolean',
      'docs/mutating-description-mentions-side-effects',
      'errors/missing-error-schema',
      'safety/mutating-requires-dry-run',
      'docs/weak-description',
      'docs/weak-description',
      'docs/weak-description',
      'docs/weak-description',
      'docs/weak-description',
    ]);
  });
});

describe('safety/financial-requires-idempotency', () => {
  test('flags financial mutating operations without idempotency inputs', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/payments/charge',
      name: 'chargePayment',
      summary: 'Charge payment',
    });

    const findings = financialRequiresIdempotencyRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(1);
  });

  test('does not flag financial operations with an idempotency key', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/payments/charge',
      name: 'chargePayment',
      parameters: [
        {
          name: 'Idempotency-Key',
          in: 'header',
          required: true,
        },
      ],
    });

    const findings = financialRequiresIdempotencyRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });
});

describe('safety/external-communication-requires-guard', () => {
  test('flags external communication operations without guard signals', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/emails/send',
      name: 'sendEmail',
      summary: 'Send email',
    });

    const findings = externalCommunicationRequiresGuardRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(1);
  });

  test('does not flag external communication operations with guard metadata', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/emails/send',
      name: 'sendEmail',
      rawOperation: {
        'x-agent-guard': {
          mode: 'require_confirmation',
        },
      },
    });

    const findings = externalCommunicationRequiresGuardRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });
});

describe('safety/destructive-requires-guard', () => {
  test('flags DELETE operations without guard fields or guard extensions', () => {
    const tool = makeTool({
      method: 'DELETE',
      path: '/users/{id}',
      name: 'deleteUser',
    });

    const findings = destructiveRequiresGuardRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('error');
  });

  test('does not flag DELETE operations with x-agent-guard metadata', () => {
    const tool = makeTool({
      method: 'DELETE',
      path: '/users/{id}',
      name: 'deleteUser',
      rawOperation: {
        'x-agent-guard': {
          mode: 'require_confirmation',
        },
      },
    });

    const findings = destructiveRequiresGuardRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });
});

describe('safety/mutating-requires-dry-run', () => {
  test('flags mutating operations without dry-run style inputs', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/users',
      name: 'createUser',
    });

    const findings = mutatingRequiresDryRunRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('warning');
  });

  test('does not flag mutating operations with dryRun input', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/users',
      name: 'createUser',
      requestBodySchema: {
        type: 'object',
        properties: {
          dryRun: {
            type: 'boolean',
          },
        },
      },
    });

    const findings = mutatingRequiresDryRunRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });
});

describe('schema/list-requires-pagination', () => {
  test('flags likely list GET operations without pagination query parameters', () => {
    const tool = makeTool({
      method: 'GET',
      path: '/customers',
      name: 'listCustomers',
      summary: 'List customers',
    });

    const findings = listRequiresPaginationRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(1);
  });

  test('does not flag likely list GET operations with a limit query parameter', () => {
    const tool = makeTool({
      method: 'GET',
      path: '/customers',
      name: 'listCustomers',
      summary: 'List customers',
      parameters: [
        {
          name: 'limit',
          in: 'query',
          required: false,
        },
      ],
    });

    const findings = listRequiresPaginationRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });
});

describe('schema/vague-boolean', () => {
  test('flags vague boolean inputs', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/users',
      name: 'createUser',
      requestBodySchema: {
        type: 'object',
        properties: {
          force: {
            type: 'boolean',
          },
        },
      },
    });

    const findings = vagueBooleanRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(1);
  });

  test('does not flag explicit boolean inputs', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/emails/send',
      name: 'sendEmail',
      requestBodySchema: {
        type: 'object',
        properties: {
          recipientConfirmed: {
            type: 'boolean',
          },
        },
      },
    });

    const findings = vagueBooleanRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });
});

describe('schema/string-should-be-enum', () => {
  test('flags likely constrained strings without enum values', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/users',
      name: 'createUser',
      requestBodySchema: {
        type: 'object',
        properties: {
          role: {
            type: 'string',
          },
        },
      },
    });

    const findings = stringShouldBeEnumRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(1);
  });

  test('does not flag likely constrained strings with enum values', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/users',
      name: 'createUser',
      requestBodySchema: {
        type: 'object',
        properties: {
          role: {
            type: 'string',
            enum: ['admin', 'member'],
          },
        },
      },
    });

    const findings = stringShouldBeEnumRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });
});

describe('schema/sensitive-response-fields', () => {
  test('flags sensitive response fields', () => {
    const tool = makeTool({
      method: 'GET',
      path: '/sessions/current',
      name: 'getCurrentSession',
      responses: [
        {
          statusCode: '200',
          schema: {
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
              },
            },
          },
        },
      ],
    });

    const findings = sensitiveResponseFieldsRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(1);
  });

  test('does not flag ordinary response fields', () => {
    const tool = makeTool({
      method: 'GET',
      path: '/users/current',
      name: 'getCurrentUser',
      responses: [
        {
          statusCode: '200',
          schema: {
            type: 'object',
            properties: {
              email: {
                type: 'string',
              },
            },
          },
        },
      ],
    });

    const findings = sensitiveResponseFieldsRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });
});

describe('docs/missing-description', () => {
  test('flags operations with no summary or description', () => {
    const tool = makeTool({
      method: 'GET',
      path: '/health',
      name: 'getHealth',
    });

    const findings = missingDescriptionRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(1);
  });
});

describe('errors/missing-error-schema', () => {
  test('flags operations without a structured 4xx or 5xx response schema', () => {
    const tool = makeTool({
      method: 'GET',
      path: '/health',
      name: 'getHealth',
      responses: [
        {
          statusCode: '200',
          description: 'OK',
        },
      ],
    });

    const findings = missingErrorSchemaRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(1);
  });

  test('does not flag operations with a structured 4xx response schema', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/customers',
      name: 'createCustomer',
      responses: [
        {
          statusCode: '400',
          description: 'Bad request',
          schema: {
            type: 'object',
          },
        },
      ],
    });

    const findings = missingErrorSchemaRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });
});

describe('docs/weak-description', () => {
  test('flags descriptions that are too short', () => {
    const tool = makeTool({
      method: 'GET',
      path: '/health',
      name: 'getHealth',
      description: 'Short desc',
    });

    const findings = weakDescriptionRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('info');
  });

  test('flags descriptions with placeholder text', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/users',
      name: 'createUser',
      description: 'TODO: write a description',
    });

    const findings = weakDescriptionRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(1);
  });

  test('does not flag substantive descriptions', () => {
    const tool = makeTool({
      method: 'GET',
      path: '/users',
      name: 'listUsers',
      description:
        'Returns a paginated list of users with their profile information and account status.',
    });

    const findings = weakDescriptionRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });

  test('does not flag missing description (handled by docs/missing-description)', () => {
    const tool = makeTool({
      method: 'GET',
      path: '/health',
      name: 'getHealth',
    });

    const findings = weakDescriptionRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });
});

describe('docs/mutating-description-mentions-side-effects', () => {
  test('flags mutating operations without side-effect verbs in the description', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/users',
      name: 'createUser',
      description: 'User operation',
    });

    const findings = mutatingDescriptionMentionsSideEffectsRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(1);
  });

  test('does not flag mutating operations with side-effect verbs', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/users',
      name: 'createUser',
      description: 'Creates a new user account',
    });

    const findings = mutatingDescriptionMentionsSideEffectsRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });

  test('does not flag read-only operations', () => {
    const tool = makeTool({
      method: 'GET',
      path: '/users',
      name: 'listUsers',
      description: 'List users',
    });

    const findings = mutatingDescriptionMentionsSideEffectsRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });
});

describe('safety/batch-operation-requires-limit', () => {
  test('flags batch operations without a limit parameter', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/users/batch',
      name: 'batchCreateUsers',
      summary: 'Batch create users',
    });

    const findings = batchOperationRequiresLimitRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(1);
  });

  test('does not flag batch operations with a limit parameter', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/users/batch',
      name: 'batchCreateUsers',
      summary: 'Batch create users',
      parameters: [
        {
          name: 'limit',
          in: 'query',
          required: false,
        },
      ],
    });

    const findings = batchOperationRequiresLimitRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });

  test('does not flag non-batch operations', () => {
    const tool = makeTool({
      method: 'GET',
      path: '/users',
      name: 'listUsers',
      summary: 'List users',
    });

    const findings = batchOperationRequiresLimitRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });
});

describe('auth/dangerous-auth-scope', () => {
  test('flags operations with a broad admin scope', () => {
    const tool = makeTool({
      method: 'DELETE',
      path: '/users/{id}',
      name: 'deleteUser',
      security: [{ oauth2: ['admin'] }],
    });

    const findings = dangerousAuthScopeRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('warning');
  });

  test('flags operations with wildcard scope', () => {
    const tool = makeTool({
      method: 'GET',
      path: '/users',
      name: 'listUsers',
      security: [{ oauth2: ['read', '*'] }],
    });

    const findings = dangerousAuthScopeRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(1);
  });

  test('does not flag fine-grained scopes', () => {
    const tool = makeTool({
      method: 'GET',
      path: '/users',
      name: 'listUsers',
      security: [{ oauth2: ['users:read'] }],
    });

    const findings = dangerousAuthScopeRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });

  test('does not flag operations with no security', () => {
    const tool = makeTool({
      method: 'GET',
      path: '/health',
      name: 'getHealth',
    });

    const findings = dangerousAuthScopeRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });
});

describe('schema/unconstrained-file-upload', () => {
  test('flags unconstrained file upload with binary format', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/documents/upload',
      name: 'uploadDocument',
      parameters: [
        {
          name: 'file',
          in: 'query',
          required: true,
          schema: { type: 'string', format: 'binary' },
        },
      ],
    });

    const findings = unconstrainedFileUploadRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(1);
  });

  test('flags unconstrained file upload in request body', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/avatars/upload',
      name: 'uploadAvatar',
      requestBodySchema: {
        type: 'object',
        properties: {
          avatar: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    });

    const findings = unconstrainedFileUploadRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(1);
  });

  test('does not flag file upload with maxLength constraint', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/documents/upload',
      name: 'uploadDocument',
      parameters: [
        {
          name: 'file',
          in: 'query',
          required: true,
          schema: { type: 'string', format: 'binary', maxLength: 1048576 },
        },
      ],
    });

    const findings = unconstrainedFileUploadRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });

  test('does not flag non-file inputs', () => {
    const tool = makeTool({
      method: 'POST',
      path: '/users',
      name: 'createUser',
      requestBodySchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
      },
    });

    const findings = unconstrainedFileUploadRule.check({
      tool,
      allTools: [tool],
    });

    expect(findings).toHaveLength(0);
  });
});

function makeTool(overrides: Partial<NormalizedTool>): NormalizedTool {
  return {
    id: overrides.name ?? 'testTool',
    name: overrides.name ?? 'testTool',
    method: 'GET',
    path: '/test',
    tags: [],
    parameters: [],
    responses: [],
    rawOperation: {},
    ...overrides,
  };
}
