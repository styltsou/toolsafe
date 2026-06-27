import type { Command } from 'commander';
import { loadConfig } from '@/config/loader';
import { parseChoiceOption, parseHeaderOption, renderCommandError } from '@/cli/helpers';
import { withAnalysis } from '@/cli/analysis';
import type { ToolSafeConfig } from '@/config/types';
import type { AnalysisResult, FindingSeverity } from '@/core/types';
import { renderJsonReport, renderTerminalReport } from '@/reporters';

type LintFormat = 'pretty' | 'json';
type FailOn = 'warning' | 'error';

type LintOptions = {
  format?: string;
  failOn?: string;
  config?: string;
  proxy?: string;
  header?: string[];
};

const FORMATS = ['pretty', 'json'] as const satisfies readonly LintFormat[];
const FAIL_ON_VALUES = ['warning', 'error'] as const satisfies readonly FailOn[];

export function registerLintCommand(program: Command): void {
  program
    .command('lint')
    .description('Analyze a local OpenAPI file for agent-readiness issues')
    .argument('<file>', 'OpenAPI YAML or JSON file')
    .option('--format <format>', 'Output format: pretty or json', 'pretty')
    .option('--fail-on <severity>', 'Exit with code 1 on warning or error')
    .option('--config <path>', 'Path to toolsafe.config.json')
    .option('--proxy <url>', 'HTTP proxy URL for remote spec fetching')
    .option('--header <value...>', 'Custom headers for remote spec fetching (Key: Value)')
    .action(async (filePath: string, options: LintOptions) => {
      const format = parseFormat(options.format);

      if (!format) {
        process.exitCode = 2;
        return;
      }

      let config: ToolSafeConfig | undefined;

      try {
        config = loadConfig(options.config);
      } catch (error) {
        process.stderr.write(renderCommandError(error));
        process.exitCode = 2;
        return;
      }

      const failOn = resolveFailOn(options.failOn, config);

      if (!failOn) {
        process.exitCode = 2;
        return;
      }

      const headers = parseHeaderOption(options.header);
      await withAnalysis(
        filePath,
        config,
        async (result) => {
          process.stdout.write(renderLintResult(result, format));

          if (hasThresholdFindings(result, failOn)) {
            process.exitCode = 1;
          }
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

function parseFormat(value: string | undefined): LintFormat | undefined {
  return parseChoiceOption(value, FORMATS, { optionName: '--format' });
}

function resolveFailOn(
  cliValue: string | undefined,
  config?: ToolSafeConfig | undefined,
): FailOn | undefined {
  if (cliValue) {
    return parseChoiceOption(cliValue, FAIL_ON_VALUES, { optionName: '--fail-on' });
  }

  if (config?.lint?.failOn) {
    return config.lint.failOn;
  }

  return 'error';
}

function renderLintResult(result: AnalysisResult, format: LintFormat): string {
  if (format === 'json') {
    return renderJsonReport(result);
  }

  return renderTerminalReport(result);
}

function hasThresholdFindings(result: AnalysisResult, failOn: FailOn): boolean {
  if (failOn === 'warning') {
    return result.findings.some(isWarningOrError);
  }

  return result.findings.some((finding) => finding.severity === 'error');
}

function isWarningOrError(finding: { severity: FindingSeverity }): boolean {
  return finding.severity === 'warning' || finding.severity === 'error';
}
