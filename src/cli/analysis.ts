import { loadConfig } from '@/config/loader';
import type { ToolSafeConfig } from '@/config/types';
import { analyzeOpenApi } from '@/core/analyze';
import type { AnalysisResult } from '@/core/types';
import { renderCommandError } from '@/cli/helpers';

export async function withAnalysis(
  filePath: string,
  configOrPath: ToolSafeConfig | undefined | string,
  fn: (result: AnalysisResult, config: ToolSafeConfig | undefined) => Promise<void>,
): Promise<void> {
  try {
    const config = typeof configOrPath === 'string' ? loadConfig(configOrPath) : configOrPath;
    const result = await analyzeOpenApi(filePath, config);
    await fn(result, config);
  } catch (error) {
    process.stderr.write(renderCommandError(error));
    process.exitCode = 2;
  }
}

export function resolveConfig<T>(
  cliValue: T | undefined,
  configValue: T | undefined,
  defaultValue: T,
): T {
  if (cliValue !== undefined) return cliValue;
  if (configValue !== undefined) return configValue;
  return defaultValue;
}
