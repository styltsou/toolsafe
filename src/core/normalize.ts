import type {
  HttpMethod,
  NormalizedParameter,
  NormalizedResponse,
  NormalizedTool,
  ParameterLocation,
} from "@/core/types";
import { asString, isObject, omitUndefined } from "@/core/objects";
import { normalizeIdentifier } from "@/core/strings";

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

const METHOD_SORT_ORDER = new Map(HTTP_METHODS.map((method, index) => [method, index]));

type OpenApiDocumentLike = {
  paths?: unknown;
};

type PathItemLike = {
  parameters?: unknown;
  get?: unknown;
  post?: unknown;
  put?: unknown;
  patch?: unknown;
  delete?: unknown;
  head?: unknown;
  options?: unknown;
};

type OperationLike = {
  operationId?: unknown;
  summary?: unknown;
  description?: unknown;
  tags?: unknown;
  parameters?: unknown;
  requestBody?: unknown;
  responses?: unknown;
  security?: unknown;
};

type ParameterLike = {
  name?: unknown;
  in?: unknown;
  required?: unknown;
  schema?: unknown;
  description?: unknown;
};

type ResponseLike = {
  description?: unknown;
  content?: unknown;
};

type MediaTypeLike = {
  schema?: unknown;
};

/**
 * Converts an OpenAPI document into Toolsmith's stable operation model.
 *
 * Normalization is intentionally conservative in v0: it extracts common
 * operation fields and common JSON schemas, then preserves the raw operation
 * for rules that need vendor extensions or less common OpenAPI metadata.
 */
export function normalizeOpenApi(document: unknown): NormalizedTool[] {
  if (!isObject(document)) {
    return [];
  }

  const apiDocument = document as OpenApiDocumentLike;

  if (!isObject(apiDocument.paths)) {
    return [];
  }

  const tools: NormalizedTool[] = [];

  for (const [path, pathItemValue] of Object.entries(apiDocument.paths)) {
    if (!isObject(pathItemValue)) {
      continue;
    }

    const pathItem = pathItemValue as PathItemLike;
    const pathParameters = normalizeParameters(pathItem.parameters);

    for (const method of HTTP_METHODS) {
      const operationValue = pathItem[method.toLowerCase() as keyof PathItemLike];

      if (!isObject(operationValue)) {
        continue;
      }

      const operation = operationValue as OperationLike;
      const operationId = asString(operation.operationId);
      const fallbackName = createFallbackOperationName(method, path);
      const name = operationId ?? fallbackName;
      const parameters = [...pathParameters, ...normalizeParameters(operation.parameters)];
      const requestBodySchema = extractRequestBodySchema(operation.requestBody);
      const responses = normalizeResponses(operation.responses);
      const security = normalizeSecurity(operation.security);

      tools.push(
        omitUndefined({
          id: name,
          operationId,
          name,
          method,
          path,
          summary: asString(operation.summary),
          description: asString(operation.description),
          tags: normalizeTags(operation.tags),
          parameters,
          requestBodySchema,
          responses,
          security,
          rawOperation: operationValue,
        }),
      );
    }
  }

  return tools.toSorted(compareTools);
}

function normalizeParameters(value: unknown): NormalizedParameter[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const parameters: NormalizedParameter[] = [];

  for (const item of value) {
    if (!isObject(item)) {
      continue;
    }

    const parameter = item as ParameterLike;
    const name = asString(parameter.name);
    const location = normalizeParameterLocation(parameter.in);

    if (!name || !location) {
      continue;
    }

    parameters.push(
      omitUndefined({
        name,
        in: location,
        required: parameter.required === true,
        schema: parameter.schema,
        description: asString(parameter.description),
      }),
    );
  }

  return parameters;
}

function normalizeResponses(value: unknown): NormalizedResponse[] {
  if (!isObject(value)) {
    return [];
  }

  const responses: NormalizedResponse[] = [];

  for (const [statusCode, responseValue] of Object.entries(value)) {
    if (!isObject(responseValue)) {
      continue;
    }

    const response = responseValue as ResponseLike;

    responses.push(
      omitUndefined({
        statusCode,
        description: asString(response.description),
        schema: extractContentSchema(response.content),
      }),
    );
  }

  return responses.toSorted((a, b) => a.statusCode.localeCompare(b.statusCode));
}

function extractRequestBodySchema(value: unknown): unknown {
  if (!isObject(value)) {
    return undefined;
  }

  return extractContentSchema(value.content);
}

function extractContentSchema(content: unknown): unknown {
  if (!isObject(content)) {
    return undefined;
  }

  const preferredSchema = extractMediaTypeSchema(content["application/json"]);

  if (preferredSchema !== undefined) {
    return preferredSchema;
  }

  for (const mediaTypeValue of Object.values(content)) {
    const schema = extractMediaTypeSchema(mediaTypeValue);

    if (schema !== undefined) {
      return schema;
    }
  }

  return undefined;
}

function extractMediaTypeSchema(value: unknown): unknown {
  if (!isObject(value)) {
    return undefined;
  }

  return (value as MediaTypeLike).schema;
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizeSecurity(value: unknown): unknown[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value;
}

function normalizeParameterLocation(value: unknown): ParameterLocation | undefined {
  if (value === "path" || value === "query" || value === "header" || value === "cookie") {
    return value;
  }

  return undefined;
}

function createFallbackOperationName(method: HttpMethod, path: string): string {
  const pathParts = path
    .split("/")
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^\{(.+)\}$/);
      return match?.[1] ? `by_${match[1]}` : part;
    })
    .join("_");

  return normalizeIdentifier(`${method.toLowerCase()}_${pathParts || "root"}`);
}

function compareTools(a: NormalizedTool, b: NormalizedTool): number {
  const pathComparison = a.path.localeCompare(b.path);

  if (pathComparison !== 0) {
    return pathComparison;
  }

  return (METHOD_SORT_ORDER.get(a.method) ?? 999) - (METHOD_SORT_ORDER.get(b.method) ?? 999);
}
