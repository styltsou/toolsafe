import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { ToolSafeError } from '@/core/errors';
import { parseOpenApi } from '@/parsers/openapi';

const SIMPLE_SPEC = readFileSync('tests/fixtures/simple-openapi.json', 'utf8');

let server: ReturnType<typeof Bun.serve>;
let serverUrl: string;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch(request) {
      const url = new URL(request.url);

      if (url.pathname === '/openapi.json') {
        return new Response(SIMPLE_SPEC, {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/not-found.json') {
        return new Response(null, { status: 404 });
      }

      if (url.pathname === '/invalid.yaml') {
        return new Response('openapi: 3.0.0\ninfo:\n  title: [broken\n', {
          headers: { 'Content-Type': 'application/yaml' },
        });
      }

      return new Response(null, { status: 404 });
    },
  });

  serverUrl = `http://localhost:${server.port}`;
});

afterAll(() => {
  server?.stop(true);
});

describe('parseOpenApi', () => {
  test('parses a valid JSON OpenAPI file', async () => {
    const result = await parseOpenApi('tests/fixtures/simple-openapi.json');

    expect(result.metadata.title).toBe('Simple API');
    expect(result.metadata.version).toBe('1.0.0');
    expect(result.metadata.openapiVersion).toBe('3.0.0');
  });

  test('parses a valid YAML OpenAPI file', async () => {
    const result = await parseOpenApi('examples/risky-openapi.yaml');

    expect(result.metadata.title).toBe('Risky Example API');
    expect(result.metadata.version).toBe('1.0.0');
    expect(result.metadata.openapiVersion).toBe('3.0.0');
  });

  test('parses a valid OpenAPI 3.1 file', async () => {
    const result = await parseOpenApi('tests/fixtures/openapi-3-1.json');

    expect(result.metadata.title).toBe('OpenAPI 3.1 API');
    expect(result.metadata.version).toBe('1.0.0');
    expect(result.metadata.openapiVersion).toBe('3.1.0');
  });

  test('throws FILE_NOT_FOUND for missing files', async () => {
    await expect(parseOpenApi('tests/fixtures/missing.yaml')).rejects.toMatchObject({
      code: 'FILE_NOT_FOUND',
    });
  });

  test('throws UNSUPPORTED_FILE_TYPE for unsupported extensions', async () => {
    await expect(parseOpenApi('README.md')).rejects.toMatchObject({
      code: 'UNSUPPORTED_FILE_TYPE',
    });
  });

  test('throws OPENAPI_PARSE_ERROR for invalid YAML', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'toolsafe-invalid-openapi-'));
    const filePath = join(directory, 'invalid-openapi.yaml');
    await writeFile(filePath, 'openapi: 3.0.0\ninfo:\n  title: [broken\n');

    await expect(parseOpenApi(filePath)).rejects.toBeInstanceOf(ToolSafeError);
    await expect(parseOpenApi(filePath)).rejects.toMatchObject({
      code: 'OPENAPI_PARSE_ERROR',
    });
  });

  test('parses a valid OpenAPI file from a remote URL', async () => {
    const result = await parseOpenApi(`${serverUrl}/openapi.json`);

    expect(result.metadata.title).toBe('Simple API');
    expect(result.metadata.version).toBe('1.0.0');
    expect(result.metadata.openapiVersion).toBe('3.0.0');
    expect(result.filePath).toBe(`${serverUrl}/openapi.json`);
  });

  test('passes custom headers to remote fetch', async () => {
    const result = await parseOpenApi(`${serverUrl}/openapi.json`, {
      headers: { Authorization: 'Bearer test123' },
    });

    expect(result.metadata.title).toBe('Simple API');
  });

  test('passes proxy and headers together', async () => {
    const result = await parseOpenApi(`${serverUrl}/openapi.json`, {
      headers: { 'X-Custom': 'value' },
    });

    expect(result.metadata.title).toBe('Simple API');
  });

  test('throws FETCH_ERROR for a non-200 remote URL', async () => {
    await expect(parseOpenApi(`${serverUrl}/not-found.json`)).rejects.toMatchObject({
      code: 'FETCH_ERROR',
    });
  });

  test('throws UNSUPPORTED_FILE_TYPE for remote URL with unsupported extension', async () => {
    await expect(parseOpenApi(`${serverUrl}/openapi.txt`)).rejects.toMatchObject({
      code: 'UNSUPPORTED_FILE_TYPE',
    });
  });

  test('throws OPENAPI_PARSE_ERROR for invalid remote content', async () => {
    await expect(parseOpenApi(`${serverUrl}/invalid.yaml`)).rejects.toMatchObject({
      code: 'OPENAPI_PARSE_ERROR',
    });
  });

  test('throws OPENAPI_UNSUPPORTED_VERSION for Swagger 2.0', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'toolsafe-swagger-2-'));
    const filePath = join(directory, 'swagger-2.json');
    await writeFile(
      filePath,
      JSON.stringify({
        swagger: '2.0',
        info: {
          title: 'Old API',
          version: '1.0.0',
        },
        paths: {},
      }),
    );

    await expect(parseOpenApi(filePath)).rejects.toMatchObject({
      code: 'OPENAPI_UNSUPPORTED_VERSION',
    });
  });
});

function hasAnyRefKey(obj: unknown): boolean {
  if (Array.isArray(obj)) {
    return obj.some(hasAnyRefKey);
  }

  if (obj && typeof obj === 'object') {
    const record = obj as Record<string, unknown>;

    if ('$ref' in record) {
      return true;
    }

    return Object.values(record).some(hasAnyRefKey);
  }

  return false;
}

function refTestSpec() {
  return {
    openapi: '3.0.0',
    info: { title: 'Ref Test', version: '1.0.0' },
    paths: {
      '/users': {
        post: {
          operationId: 'createUser',
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/UserResponse' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            role: { type: 'string' },
            force: { type: 'boolean' },
          },
        },
        UserResponse: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            token: { type: 'string' },
          },
        },
      },
    },
  };
}

test('resolves $ref references in the parsed document', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'toolsafe-ref-test-'));
  const filePath = join(directory, 'ref-test.json');
  await writeFile(filePath, JSON.stringify(refTestSpec()));

  const result = await parseOpenApi(filePath);

  try {
    expect(hasAnyRefKey(result.document)).toBe(false);

    const document = result.document as Record<string, unknown>;
    const paths = document.paths as Record<string, unknown>;
    const usersPath = paths['/users'] as Record<string, unknown>;
    const post = usersPath['post'] as Record<string, unknown>;

    const requestBody = post['requestBody'] as Record<string, unknown>;
    const reqContent = requestBody['content'] as Record<string, unknown>;
    const reqJson = reqContent['application/json'] as Record<string, unknown>;
    const reqSchema = reqJson['schema'] as Record<string, unknown>;
    const reqProps = reqSchema['properties'] as Record<string, unknown>;

    expect(reqSchema['type']).toBe('object');
    expect(Object.keys(reqProps)).toEqual(['name', 'role', 'force']);
    expect(reqProps['role']).toEqual({ type: 'string' });
    expect(reqProps['force']).toEqual({ type: 'boolean' });

    const responses = post['responses'] as Record<string, unknown>;
    const res201 = responses['201'] as Record<string, unknown>;
    const resContent = res201['content'] as Record<string, unknown>;
    const resJson = resContent['application/json'] as Record<string, unknown>;
    const resSchema = resJson['schema'] as Record<string, unknown>;
    const resProps = resSchema['properties'] as Record<string, unknown>;

    expect(resSchema['type']).toBe('object');
    expect(Object.keys(resProps)).toEqual(['id', 'token']);
  } finally {
    await writeFile(filePath, '');
  }
});

test('throws on unresolvable $ref', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'toolsafe-broken-ref-'));
  const filePath = join(directory, 'broken-ref.json');
  const spec: Record<string, unknown> = refTestSpec();
  const paths = spec.paths as Record<string, unknown>;
  const usersPath = paths['/users'] as Record<string, unknown>;
  const post = usersPath['post'] as Record<string, unknown>;
  const responses = post['responses'] as Record<string, unknown>;
  const res201 = responses['201'] as Record<string, unknown>;
  const resContent = res201['content'] as Record<string, unknown>;
  const resJson = resContent['application/json'] as Record<string, unknown>;

  resJson['schema'] = { $ref: '#/components/schemas/NonExistent' };
  await writeFile(filePath, JSON.stringify(spec));

  try {
    await expect(parseOpenApi(filePath)).rejects.toBeInstanceOf(ToolSafeError);
    await expect(parseOpenApi(filePath)).rejects.toMatchObject({
      code: 'OPENAPI_PARSE_ERROR',
    });
  } finally {
    await writeFile(filePath, '');
  }
});
