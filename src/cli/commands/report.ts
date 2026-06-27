import type { Command } from 'commander';
import { parseChoiceOption, renderCommandError, writeOutputFile } from '@/cli/helpers';
import { loadConfig } from '@/config/loader';
import type { ToolSafeConfig } from '@/config/types';
import { resolveConfig, withAnalysis } from '@/cli/analysis';
import type { AnalysisResult } from '@/core/types';
import { renderJsonReport, renderMarkdownReport, renderSarifReport } from '@/reporters';

type ReportFormat = 'json' | 'markdown' | 'sarif';

type ReportOptions = {
  format?: string;
  out?: string;
  config?: string;
};

const REPORT_FORMATS = ['json', 'markdown', 'sarif'] as const satisfies readonly ReportFormat[];

export function registerReportCommand(program: Command): void {
  program
    .command('report')
    .description('Generate a JSON, Markdown, or SARIF ToolSafe report')
    .argument('<file>', 'OpenAPI YAML or JSON file')
    .option('--format <format>', 'Output format: json, markdown, or sarif')
    .option('--out <path>', 'Write report to a file instead of stdout')
    .option('--config <path>', 'Path to toolsafe.config.json')
    .action(async (filePath: string, options: ReportOptions) => {
      let config: ToolSafeConfig | undefined;

      try {
        config = loadConfig(options.config);
      } catch (error) {
        process.stderr.write(renderCommandError(error));
        process.exitCode = 2;
        return;
      }

      const parsedFormat = options.format !== undefined
        ? parseReportFormat(options.format)
        : undefined;

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

      await withAnalysis(filePath, config, async (result) => {
        const output = renderReport(result, format);

        if (outPath) {
          await writeOutputFile(outPath, output);
          return;
        }

        process.stdout.write(output);
      });
    });
}

function parseReportFormat(value: string | undefined): ReportFormat | undefined {
  return parseChoiceOption(value, REPORT_FORMATS, { optionName: '--format' });
}

function renderReport(result: AnalysisResult, format: ReportFormat): string {
  if (format === 'json') {
    return renderJsonReport(result);
  }

  if (format === 'sarif') {
    return renderSarifReport(result);
  }

  return renderMarkdownReport(result);
}
