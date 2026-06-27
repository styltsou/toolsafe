import type { Command } from "commander";
import { parseChoiceOption, renderCommandError } from "@/cli/helpers";
import { analyzeOpenApi } from "@/core/analyze";
import type { AnalysisResult, FindingSeverity } from "@/core/types";
import { renderJsonReport, renderTerminalReport } from "@/reporters";

type LintFormat = "pretty" | "json";
type FailOn = "warning" | "error";

type LintOptions = {
  format?: string;
  failOn?: string;
};

const FORMATS = ["pretty", "json"] as const satisfies readonly LintFormat[];
const FAIL_ON_VALUES = ["warning", "error"] as const satisfies readonly FailOn[];

export function registerLintCommand(program: Command): void {
  program
    .command("lint")
    .description("Analyze a local OpenAPI file for agent-readiness issues")
    .argument("<file>", "OpenAPI YAML or JSON file")
    .option("--format <format>", "Output format: pretty or json", "pretty")
    .option("--fail-on <severity>", "Exit with code 1 on warning or error", "error")
    .action(async (filePath: string, options: LintOptions) => {
      const format = parseFormat(options.format);
      const failOn = parseFailOn(options.failOn);

      if (!format || !failOn) {
        process.exitCode = 2;
        return;
      }

      try {
        const result = await analyzeOpenApi(filePath);
        process.stdout.write(renderLintResult(result, format));

        if (hasThresholdFindings(result, failOn)) {
          process.exitCode = 1;
        }
      } catch (error) {
        process.stderr.write(renderCommandError(error));
        process.exitCode = 2;
      }
    });
}

function parseFormat(value: string | undefined): LintFormat | undefined {
  return parseChoiceOption(value, FORMATS, { optionName: "--format" });
}

function parseFailOn(value: string | undefined): FailOn | undefined {
  return parseChoiceOption(value, FAIL_ON_VALUES, { optionName: "--fail-on" });
}

function renderLintResult(result: AnalysisResult, format: LintFormat): string {
  if (format === "json") {
    return renderJsonReport(result);
  }

  return renderTerminalReport(result);
}

function hasThresholdFindings(result: AnalysisResult, failOn: FailOn): boolean {
  if (failOn === "warning") {
    return result.findings.some(isWarningOrError);
  }

  return result.findings.some((finding) => finding.severity === "error");
}

function isWarningOrError(finding: { severity: FindingSeverity }): boolean {
  return finding.severity === "warning" || finding.severity === "error";
}
