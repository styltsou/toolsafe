import { validate, dereference } from '@scalar/openapi-parser';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { FetchOptions } from '@/fetch';
import { fetchText } from '@/fetch';
import { ToolSafeError } from '@/core/errors';
import { isObject } from '@/core/objects';

const SUPPORTED_EXTENSIONS = new Set(['.yaml', '.yml', '.json']);

/**
 * Metadata ToolSafe needs before operation normalization.
 *
 * The full OpenAPI document stays separate so parser consumers can choose how
 * deeply they want to inspect the spec.
 */
export type OpenApiMetadata = {
  title?: string | undefined;
  version?: string | undefined;
  openapiVersion: string;
};

/**
 * Parsed OpenAPI input plus stable metadata extracted by ToolSafe.
 */
export type ParsedOpenApi = {
  filePath: string;
  document: unknown;
  metadata: OpenApiMetadata;
};

type OpenApiLike = {
  openapi?: unknown;
  swagger?: unknown;
  info?: {
    title?: unknown;
    version?: unknown;
  };
};

const URL_PROTOCOLS = new Set(['http:', 'https:']);

function isUrl(filePath: string): boolean {
  try {
    const url = new URL(filePath);
    return URL_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

function assertSupportedExtension(path: string, context: string, displayPath: string): void {
  const extension = extname(path).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new ToolSafeError(
      'UNSUPPORTED_FILE_TYPE',
      `ToolSafe only supports .yaml, .yml, and .json ${context}.`,
      displayPath,
    );
  }
}

function extractMetadata(document: unknown, filePath: string): OpenApiMetadata {
  if (!isObject(document)) {
    throw new ToolSafeError('OPENAPI_PARSE_ERROR', 'OpenAPI document must be an object.', filePath);
  }

  const candidate = document as OpenApiLike;
  const openapiVersion = typeof candidate.openapi === 'string' ? candidate.openapi : undefined;
  const swaggerVersion = typeof candidate.swagger === 'string' ? candidate.swagger : undefined;

  if (!openapiVersion) {
    if (swaggerVersion) {
      throw new ToolSafeError(
        'OPENAPI_UNSUPPORTED_VERSION',
        `Only OpenAPI 3.x is supported. Received Swagger: ${swaggerVersion}`,
        filePath,
      );
    }

    throw new ToolSafeError('OPENAPI_PARSE_ERROR', 'Missing required openapi field.', filePath);
  }

  if (!openapiVersion.startsWith('3.')) {
    throw new ToolSafeError(
      'OPENAPI_UNSUPPORTED_VERSION',
      `Only OpenAPI 3.x is supported. Received: ${openapiVersion}`,
      filePath,
    );
  }

  return {
    openapiVersion,
    title: typeof candidate.info?.title === 'string' ? candidate.info.title : undefined,
    version: typeof candidate.info?.version === 'string' ? candidate.info.version : undefined,
  };
}

async function fetchOpenApiFile(url: URL, fetchOptions?: FetchOptions): Promise<string> {
  try {
    return await fetchText(url, fetchOptions);
  } catch (error) {
    throw new ToolSafeError(
      'FETCH_ERROR',
      `Failed to fetch ${url.href}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      url.href,
    );
  }
}

async function parseFromSource(source: string, filePath: string): Promise<ParsedOpenApi> {
  await validateOpenApiSource(source, filePath);
  const parsed = parseOpenApiSource(source, filePath);
  const metadata = extractMetadata(parsed, filePath);
  // dereference is currently synchronous — if @scalar/openapi-parser
  // ever makes it async, this call will need an await.
  const document = dereferenceOpenApiSource(parsed, filePath);

  return { filePath, document, metadata };
}

/**
 * Parses and validates an OpenAPI 3.x document from a local file or remote URL.
 *
 * For local files, checks existence and supported extension before reading.
 * For URLs (http/https), fetches the content and validates the URL extension.
 * Wraps expected user-facing failures in `ToolSafeError` so CLI commands can
 * print clean messages without depending on Scalar parser error internals.
 */
export async function parseOpenApi(
  filePath: string,
  fetchOptions?: FetchOptions,
): Promise<ParsedOpenApi> {
  if (isUrl(filePath)) {
    const url = new URL(filePath);

    assertSupportedExtension(url.pathname, 'URLs', url.href);

    const source = await fetchOpenApiFile(url, fetchOptions);

    return parseFromSource(source, filePath);
  }

  if (!existsSync(filePath)) {
    throw new ToolSafeError('FILE_NOT_FOUND', `File not found: ${filePath}`, filePath);
  }

  assertSupportedExtension(filePath, 'files', filePath);

  const source = await readFile(filePath, 'utf8');

  return parseFromSource(source, filePath);
}

async function validateOpenApiSource(source: string, filePath: string) {
  try {
    const result = await validate(source);

    if (!result.valid) {
      throw new ToolSafeError('OPENAPI_PARSE_ERROR', formatScalarErrors(result.errors), filePath);
    }

    return result;
  } catch (error) {
    if (error instanceof ToolSafeError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Could not parse OpenAPI file.';
    throw new ToolSafeError('OPENAPI_PARSE_ERROR', message, filePath);
  }
}

function parseOpenApiSource(source: string, filePath: string): unknown {
  try {
    return parseYaml(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not parse OpenAPI file.';
    throw new ToolSafeError('OPENAPI_PARSE_ERROR', message, filePath);
  }
}

function dereferenceOpenApiSource(parsed: unknown, filePath: string): unknown {
  try {
    const result = dereference(parsed as Record<string, unknown>);

    if (result.errors?.length) {
      throw new ToolSafeError('OPENAPI_PARSE_ERROR', formatScalarErrors(result.errors), filePath);
    }

    if (!result.schema) {
      throw new ToolSafeError('OPENAPI_PARSE_ERROR', '$ref resolution produced no output.', filePath);
    }

    return result.schema;
  } catch (error) {
    if (error instanceof ToolSafeError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Could not resolve $ref references.';
    throw new ToolSafeError('OPENAPI_PARSE_ERROR', message, filePath);
  }
}

function formatScalarErrors(errors: { message: string; path?: string[] }[]): string {
  return errors
    .map((error) => {
      const path = error.path?.length ? `${error.path.join('.')}: ` : '';
      return `${path}${error.message}`;
    })
    .join('; ');
}
