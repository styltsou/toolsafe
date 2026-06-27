import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ToolSafeConfigSchema, type ToolSafeConfig } from '@/config/types';

const CONFIG_FILENAME = 'toolsafe.config.json';

export function loadConfig(configPath?: string): ToolSafeConfig | null {
  const resolvedPath = resolveConfigPath(configPath);

  if (!resolvedPath) {
    return null;
  }

  const raw = readFileSync(resolvedPath, 'utf8');
  const parsed = JSON.parse(raw);

  const result = ToolSafeConfigSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(
      `Invalid toolsafe.config.json: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`,
    );
  }

  return result.data;
}

function resolveConfigPath(configPath?: string): string | null {
  if (configPath) {
    return existsSync(configPath) ? configPath : null;
  }

  const defaultPath = join(process.cwd(), CONFIG_FILENAME);

  return existsSync(defaultPath) ? defaultPath : null;
}
