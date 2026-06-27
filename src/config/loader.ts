import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ToolSafeConfigSchema, type ToolSafeConfig } from '@/config/types';

const CONFIG_FILENAME = 'toolsafe.config.json';

export function loadConfig(configPath?: string): ToolSafeConfig | undefined {
  const resolvedPath = resolveConfigPath(configPath);

  if (!resolvedPath) {
    return undefined;
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
    if (!existsSync(configPath)) {
      throw new Error(
        `Config file not found at the specified --config path: ${configPath}`,
      );
    }
    return configPath;
  }

  const defaultPath = join(process.cwd(), CONFIG_FILENAME);

  return existsSync(defaultPath) ? defaultPath : null;
}
