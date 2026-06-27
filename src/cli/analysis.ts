import type { FetchOptions } from '@/fetch';
import { loadConfig } from '@/config/loader';
import type { ToolSafeConfig } from '@/config/types';
import { analyzeOpenApi } from '@/core/analyze';
import type { AnalysisResult } from '@/core/types';
import { renderCommandError } from '@/cli/helpers';

export type AnalysisOptions = {
  fetch?: FetchOptions;
};

export async function withAnalysis(
  filePath: string,
  configOrPath: ToolSafeConfig | undefined | string,
  fn: (result: AnalysisResult, config: ToolSafeConfig | undefined) => Promise<void>,
  analysisOptions?: AnalysisOptions,
): Promise<void> {
  try {
    const config = typeof configOrPath === 'string' ? loadConfig(configOrPath) : configOrPath;
    const fetchOptions = resolveFetchOptions(analysisOptions, config);
    const result = await analyzeOpenApi(filePath, config, fetchOptions);
    await fn(result, config);
  } catch (error) {
    process.stderr.write(renderCommandError(error));
    process.exitCode = 2;
  }
}

function resolveFetchOptions(
  analysisOptions?: AnalysisOptions,
  config?: ToolSafeConfig | undefined,
): FetchOptions | undefined {
  const proxy = analysisOptions?.fetch?.proxy ?? config?.fetch?.proxy;
  const headers = { ...config?.fetch?.headers, ...analysisOptions?.fetch?.headers };
  const hasHeaders = config?.fetch?.headers || analysisOptions?.fetch?.headers;
  const hasProxy = proxy !== undefined;

  if (!hasProxy && !hasHeaders) return undefined;

  return {
    ...(hasProxy && { proxy }),
    ...(hasHeaders && { headers }),
  };
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
