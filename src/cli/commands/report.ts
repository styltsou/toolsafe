import type { Command } from 'commander';
import { loadConfig } from '@/config/loader';
import { parseChoiceOption, renderCommandError, writeOutputFile } from '@/cli/helpers';
import { analyzeOpenApi } from '@/core/analyze';
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
    .option('--format <format>', 'Output format: json, markdown, or sarif', 'markdown')
    .option('--out <path>', 'Write report to a file instead of stdout')
    .option('--config <path>', 'Path to toolsafe.config.json')
    .action(async (filePath: string, options: ReportOptions) => {
      const format = parseReportFormat(options.format);

      if (!format) {
        process.exitCode = 2;
        return;
      }

      try {
        const config = loadConfig(options.config);
        const result = await analyzeOpenApi(filePath, config);
        const output = renderReport(result, format);

        if (options.out) {
          await writeOutputFile(options.out, output);
          return;
        }

        process.stdout.write(output);
      } catch (error) {
        process.stderr.write(renderCommandError(error));
        process.exitCode = 2;
      }
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
