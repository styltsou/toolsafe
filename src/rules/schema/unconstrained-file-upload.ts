import type { Rule } from '@/core/types';
import { getInputSchemaProperties, hasSchemaConstraint, isStringSchema } from '@/core/schema';
import { isObject } from '@/core/objects';
import { matchesNormalizedName } from '@/core/strings';
import { createFinding } from '@/rules/findings';

const FILE_FORMATS = ['binary', 'base64'];

const FILE_CONSTRAINTS = ['maxLength', 'minLength', 'maxFileSize', 'x-max-file-size'];

const FILE_KEYWORDS = [
  'file',
  'upload',
  'attachment',
  'document',
  'image',
  'photo',
  'avatar',
  'resume',
  'pdf',
];

type NamedInput = {
  name: string;
  schema: unknown;
};

/**
 * Flags file upload inputs that lack size or content constraints.
 *
 * Unconstrained file uploads are risky because agents could upload
 * arbitrarily large or unexpected files.
 */
export const unconstrainedFileUploadRule: Rule = {
  id: 'schema/unconstrained-file-upload',
  name: 'Unconstrained file upload',
  description: 'Flags file upload inputs that lack size or content constraints.',
  category: 'schema',
  defaultSeverity: 'warning',
  check: ({ tool }) => {
    const fileInputs: NamedInput[] = getInputSchemaProperties(tool).filter((property) =>
      isFileSchema(property.schema, property.name),
    );

    if (fileInputs.length === 0) {
      return [];
    }

    const unconstrained = fileInputs.filter(
      (input) => !hasSchemaConstraint(input.schema, FILE_CONSTRAINTS),
    );

    if (unconstrained.length === 0) {
      return [];
    }

    return unconstrained.map((input) =>
      createFinding(unconstrainedFileUploadRule, tool, {
        message: `File input '${input.name}' has no size constraints.`,
        recommendation:
          'Add maxLength, maxFileSize, or x-max-file-size to limit uploads and prevent resource exhaustion.',
        evidence: [`Unconstrained file input: ${input.name}`],
      }),
    );
  },
};

function isFileSchema(schema: unknown, name: string): boolean {
  if (!isObject(schema)) {
    return false;
  }

  const format = (schema as Record<string, unknown>).format;

  if (typeof format === 'string' && matchesNormalizedName(format, FILE_FORMATS)) {
    return true;
  }

  if (isStringSchema(schema) && matchesNormalizedName(name, FILE_KEYWORDS)) {
    return true;
  }

  return false;
}
