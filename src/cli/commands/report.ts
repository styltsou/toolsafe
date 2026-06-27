import type { Command } from 'commander';
import {
  parseChoiceOption,
  parseHeaderOption,
  renderCommandError,
  writeOutputFile,
} from '@/cli/helpers';
import { loadConfig } from '@/config/loader';
import type { ToolSafeConfig } from '@/config/types';
import { resolveConfig, withAnalysis } from '@/cli/analysis';
import type { AnalysisResult } from '@/core/types';
import {
  renderHtmlReport,
  renderJsonReport,
  renderMarkdownReport,
  renderSarifReport,
} from '@/reporters';

type ReportFormat = 'html' | 'json' | 'markdown' | 'sarif';

type ReportOptions = {
  format?: string;
  out?: string;
  config?: string;
  proxy?: string;
  header?: string[];
};

const REPORT_FORMATS = [
  'html',
  'json',
  'markdown',
  'sarif',
] as const satisfies readonly ReportFormat[];

export function registerReportCommand(program: Command): void {
  program
    .command('report')
    .description('Generate an HTML, JSON, Markdown, or SARIF ToolSafe report')
    .argument('<file>', 'OpenAPI YAML or JSON file')
    .option('--format <format>', 'Output format: html, json, markdown, or sarif')
    .option('--out <path>', 'Write report to a file instead of stdout')
    .option('--config <path>', 'Path to toolsafe.config.json')
    .option('--proxy <url>', 'HTTP proxy URL for remote spec fetching')
    .option('--header <value...>', 'Custom headers for remote spec fetching (Key: Value)')
    .action(async (filePath: string, options: ReportOptions) => {
      let config: ToolSafeConfig | undefined;

      try {
        config = loadConfig(options.config);
      } catch (error) {
        process.stderr.write(renderCommandError(error));
        process.exitCode = 2;
        return;
      }

      const parsedFormat =
        options.format !== undefined ? parseReportFormat(options.format) : undefined;

      if (options.format !== undefined && parsedFormat === undefined) {
        process.exitCode = 2;
        return;
      }

      const format = resolveConfig(
        parsedFormat,
        config?.report?.format,
        'markdown' as ReportFormat,
      );

      const outPath = resolveConfig(options.out, config?.report?.out, undefined);

      const headers = parseHeaderOption(options.header);
      await withAnalysis(
        filePath,
        config,
        async (result) => {
          const output = renderReport(result, format);

          if (outPath) {
            await writeOutputFile(outPath, output);
            return;
          }

          process.stdout.write(output);
        },
        {
          fetch: {
            ...(options.proxy ? { proxy: options.proxy } : {}),
            ...(headers ? { headers } : {}),
          },
        },
      );
    });
}

function parseReportFormat(value: string | undefined): ReportFormat | undefined {
  return parseChoiceOption(value, REPORT_FORMATS, { optionName: '--format' });
}

function renderReport(result: AnalysisResult, format: ReportFormat): string {
  if (format === 'html') {
    return renderHtmlReport(result);
  }

  if (format === 'json') {
    return renderJsonReport(result);
  }

  if (format === 'sarif') {
    return renderSarifReport(result);
  }

  return renderMarkdownReport(result);
}
