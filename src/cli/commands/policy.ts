import type { Command } from 'commander';
import { loadConfig } from '@/config/loader';
import { renderCommandError, writeOutputFile } from '@/cli/helpers';
import { analyzeOpenApi } from '@/core/analyze';
import { generatePolicyDraft, renderPolicyYaml } from '@/generators/policy';

type PolicyOptions = {
  out?: string;
  config?: string;
};

export function registerPolicyCommand(program: Command): void {
  program
    .command('policy')
    .description('Generate an advisory guard policy draft')
    .argument('<file>', 'OpenAPI YAML or JSON file')
    .option('--out <path>', 'Write policy to a file instead of stdout')
    .option('--config <path>', 'Path to toolsafe.config.json')
    .action(async (filePath: string, options: PolicyOptions) => {
      try {
        const config = loadConfig(options.config);
        const result = await analyzeOpenApi(filePath, config ?? undefined);
        const output = renderPolicyYaml(generatePolicyDraft(result));

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
