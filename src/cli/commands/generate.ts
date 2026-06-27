import type { Command } from 'commander';
import { parseChoiceOption, writeOutputFile } from '@/cli/helpers';
import { withAnalysis } from '@/cli/analysis';
import { generatePolicyDraft, renderPolicyYaml } from '@/generators/policy';
import { generateEvalIdeas, renderEvalIdeasYaml } from '@/generators/evals';
import type { AnalysisResult } from '@/core/types';

type GenerateKind = 'policy' | 'evals';

type GenerateOptions = {
  kind?: string;
  out?: string;
  config?: string;
};

const GENERATE_KINDS = ['policy', 'evals'] as const satisfies readonly GenerateKind[];

const GENERATORS: Record<GenerateKind, (result: AnalysisResult) => string> = {
  policy: (r) => renderPolicyYaml(generatePolicyDraft(r)),
  evals: (r) => renderEvalIdeasYaml(generateEvalIdeas(r)),
};

export function registerGenerateCommand(program: Command): void {
  program
    .command('generate')
    .description('Generate an advisory guard policy draft or eval case ideas')
    .argument('<file>', 'OpenAPI YAML or JSON file')
    .option('--kind <kind>', 'Output kind: policy or evals', 'policy')
    .option('--out <path>', 'Write output to a file instead of stdout')
    .option('--config <path>', 'Path to toolsafe.config.json')
    .action(async (filePath: string, options: GenerateOptions) => {
      const kind = parseGenerateKind(options.kind);

      if (!kind) {
        process.exitCode = 2;
        return;
      }

      await withAnalysis(filePath, options.config, async (result) => {
        const output = GENERATORS[kind](result);

        if (options.out) {
          await writeOutputFile(options.out, output);
          return;
        }

        process.stdout.write(output);
      });
    });
}

function parseGenerateKind(value: string | undefined): GenerateKind | undefined {
  return parseChoiceOption(value, GENERATE_KINDS, { optionName: '--kind' });
}
