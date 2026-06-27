import { describe, expect, test } from 'bun:test';
import { parseOpenApi } from '@/parsers/openapi';
import { normalizeOpenApi } from '@/core/normalize';

describe('normalizeOpenApi', () => {
  test('extracts operations in deterministic path and method order', async () => {
    const parsed = await parseOpenApi('tests/fixtures/normalizer-openapi.json');
    const tools = normalizeOpenApi(parsed.document);

    expect(tools.map((tool) => tool.id)).toEqual([
      'get_customers',
      'createCustomer',
      'getCustomer',
    ]);
  });

  test('generates fallback operation names when operationId is missing', async () => {
    const parsed = await parseOpenApi('tests/fixtures/normalizer-openapi.json');
    const tools = normalizeOpenApi(parsed.document);
    const listCustomers = tools.find((tool) => tool.path === '/customers' && tool.method === 'GET');

    expect(listCustomers?.id).toBe('get_customers');
    expect(listCustomers?.name).toBe('get_customers');
    expect(listCustomers?.operationId).toBeUndefined();
  });

  test('extracts path and query parameters', async () => {
    const parsed = await parseOpenApi('tests/fixtures/normalizer-openapi.json');
    const tools = normalizeOpenApi(parsed.document);
    const listCustomers = tools.find((tool) => tool.id === 'get_customers');
    const getCustomer = tools.find((tool) => tool.id === 'getCustomer');

    expect(listCustomers?.parameters).toMatchObject([
      {
        name: 'limit',
        in: 'query',
        required: false,
      },
    ]);

    expect(getCustomer?.parameters).toMatchObject([
      {
        name: 'id',
        in: 'path',
        required: true,
      },
    ]);
  });

  test('extracts request body schema, responses, security, and operation metadata', async () => {
    const parsed = await parseOpenApi('tests/fixtures/normalizer-openapi.json');
    const tools = normalizeOpenApi(parsed.document);
    const createCustomer = tools.find((tool) => tool.id === 'createCustomer');

    expect(createCustomer?.method).toBe('POST');
    expect(createCustomer?.summary).toBe('Create customer');
    expect(createCustomer?.description).toBe('Creates a customer record.');
    expect(createCustomer?.tags).toEqual(['customers']);
    expect(createCustomer?.requestBodySchema).toMatchObject({
      type: 'object',
      required: ['email'],
    });
    expect(createCustomer?.responses).toMatchObject([
      {
        statusCode: '201',
        description: 'Created',
      },
      {
        statusCode: '400',
        description: 'Bad request',
        schema: {
          type: 'object',
        },
      },
    ]);
    expect(createCustomer?.security).toEqual([
      {
        oauth: ['customers:write'],
      },
    ]);
    expect(createCustomer?.rawOperation).toBeDefined();
  });

  test('returns an empty array for non-object documents', () => {
    expect(normalizeOpenApi(null)).toEqual([]);
  });

  test('preserves OpenAPI 3.1 JSON Schema shapes', async () => {
    const parsed = await parseOpenApi('tests/fixtures/openapi-3-1.json');
    const tools = normalizeOpenApi(parsed.document);
    const updateProfile = tools.find((tool) => tool.id === 'updateProfile');

    expect(updateProfile?.requestBodySchema).toMatchObject({
      type: 'object',
      properties: {
        displayName: {
          type: ['string', 'null'],
        },
      },
    });
  });
});
