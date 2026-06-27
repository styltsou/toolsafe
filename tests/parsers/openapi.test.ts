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
