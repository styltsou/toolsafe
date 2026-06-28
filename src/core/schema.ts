import type { NormalizedTool } from '@/core/types';
import { isObject } from '@/core/objects';
import { matchesNormalizedName } from '@/core/strings';

type ObjectSchemaLike = {
  type?: unknown;
  enum?: unknown;
  properties?: unknown;
  items?: unknown;
};

export type SchemaProperty = {
  name: string;
  schema: unknown;
};

export function hasAnyInputField(tool: NormalizedTool, names: readonly string[]): boolean {
  for (const parameter of tool.parameters) {
    if (matchesNormalizedName(parameter.name, names)) {
      return true;
    }
  }

  return getTopLevelSchemaPropertyNames(tool.requestBodySchema).some((propertyName) =>
    matchesNormalizedName(propertyName, names),
  );
}

export function hasAnyQueryParameter(tool: NormalizedTool, names: readonly string[]): boolean {
  return tool.parameters.some(
    (parameter) => parameter.in === 'query' && matchesNormalizedName(parameter.name, names),
  );
}

export function hasArrayInput(tool: NormalizedTool): boolean {
  return (
    tool.parameters.some((parameter) => isArraySchema(parameter.schema)) ||
    isArraySchema(tool.requestBodySchema) ||
    getTopLevelSchemaProperties(tool.requestBodySchema).some((property) =>
      isArraySchema(property.schema),
    )
  );
}

export function getTopLevelSchemaPropertyNames(schema: unknown): string[] {
  return getTopLevelSchemaProperties(schema).map((property) => property.name);
}

export function getTopLevelSchemaProperties(schema: unknown): SchemaProperty[] {
  if (!isObject(schema)) {
    return [];
  }

  const schemaLike = schema as ObjectSchemaLike;

  if (!isObject(schemaLike.properties)) {
    return [];
  }

  return Object.entries(schemaLike.properties).map(([name, propertySchema]) => ({
    name,
    schema: propertySchema,
  }));
}

export function getResponseSchemaProperties(tool: NormalizedTool): SchemaProperty[] {
  return tool.responses.flatMap((response) =>
    getTopLevelSchemaProperties(unwrapArraySchema(response.schema)),
  );
}

export function getInputSchemaProperties(tool: NormalizedTool): SchemaProperty[] {
  const parameterProperties = tool.parameters.map((parameter) => ({
    name: parameter.name,
    schema: parameter.schema,
  }));

  return [
    ...parameterProperties,
    ...getTopLevelSchemaProperties(unwrapArraySchema(tool.requestBodySchema)),
  ];
}

export function isBooleanSchema(schema: unknown): boolean {
  return getSchemaType(schema) === 'boolean';
}

export function isStringSchema(schema: unknown): boolean {
  return getSchemaType(schema) === 'string';
}

export function hasEnum(schema: unknown): boolean {
  return isObject(schema) && Array.isArray((schema as ObjectSchemaLike).enum);
}

export function hasSchemaConstraint(schema: unknown, constraintNames: readonly string[]): boolean {
  if (!isObject(schema)) {
    return false;
  }

  return constraintNames.some(
    (name) => typeof (schema as Record<string, unknown>)[name] === 'number',
  );
}

export function hasSchemaKeyword(schema: unknown, keywordNames: readonly string[]): boolean {
  if (!isObject(schema)) {
    return false;
  }

  return keywordNames.some((name) => (schema as Record<string, unknown>)[name] !== undefined);
}

function getSchemaType(schema: unknown): string | undefined {
  if (!isObject(schema)) {
    return undefined;
  }

  const type = (schema as ObjectSchemaLike).type;

  return typeof type === 'string' ? type : undefined;
}

function isArraySchema(schema: unknown): boolean {
  return getSchemaType(schema) === 'array';
}

function unwrapArraySchema(schema: unknown): unknown {
  if (!isObject(schema)) {
    return schema;
  }

  const schemaLike = schema as ObjectSchemaLike;

  if (schemaLike.type === 'array' && schemaLike.items !== undefined) {
    return schemaLike.items;
  }

  return schema;
}
