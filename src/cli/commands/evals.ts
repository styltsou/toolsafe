import type { Command } from 'commander';
import { loadConfig } from '@/config/loader';
import { renderCommandError, writeOutputFile } from '@/cli/helpers';
import { analyzeOpenApi } from '@/core/analyze';
import { generateEvalIdeas, renderEvalIdeasYaml } from '@/generators/evals';

type EvalsOptions = {
  out?: string;
  config?: string;
};

export function registerEvalsCommand(program: Command): void {
  program
    .command('evals')
    .description('Generate advisory eval case ideas')
    .argument('<file>', 'OpenAPI YAML or JSON file')
    .option('--out <path>', 'Write eval ideas to a file instead of stdout')
    .option('--config <path>', 'Path to toolsafe.config.json')
    .action(async (filePath: string, options: EvalsOptions) => {
      try {
        const config = loadConfig(options.config);
        const result = await analyzeOpenApi(filePath, config);
        const output = renderEvalIdeasYaml(generateEvalIdeas(result));

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
