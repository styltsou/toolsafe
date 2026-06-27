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
  if (value && choices.includes(value as T)) {
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
