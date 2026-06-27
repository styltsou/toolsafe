import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ToolSafeError } from '@/core/errors';

export function parseChoiceOption<T extends string>(
  value: string | undefined,
  choices: readonly T[],
  options: {
    optionName: string;
  },
): T | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (choices.includes(value as T)) {
    return value as T;
  }

  process.stderr.write(
    `Invalid ${options.optionName} value. Expected ${formatChoices(choices)}.\n`,
  );
  return undefined;
}

export async function writeOutputFile(filePath: string, output: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, output, 'utf8');
}

export function renderCommandError(error: unknown): string {
  if (error instanceof ToolSafeError) {
    return `ToolSafe ${error.code}: ${error.message}\n`;
  }

  const message = error instanceof Error ? error.message : 'Unexpected ToolSafe failure.';
  return `ToolSafe ERROR: ${message}\n`;
}

function formatChoices(choices: readonly string[]): string {
  return choices.join(' or ');
}

export function parseHeaderOption(
  values: string[] | undefined,
): Record<string, string> | undefined {
  if (!values || values.length === 0) return undefined;

  const headers: Record<string, string> = {};

  for (const value of values) {
    const colonIndex = value.indexOf(':');
    if (colonIndex === -1) {
      process.stderr.write(`Invalid header format: "${value}". Expected "Key: Value".\n`);
      continue;
    }

    const key = value.substring(0, colonIndex).trim();
    const val = value.substring(colonIndex + 1).trim();

    if (key) {
      headers[key] = val;
    }
  }

  return Object.keys(headers).length > 0 ? headers : undefined;
}
