import type { Command } from 'commander';
import { renderCommandError, writeOutputFile } from '@/cli/helpers';
import { analyzeOpenApi } from '@/core/analyze';
import { generatePolicyDraft, renderPolicyYaml } from '@/generators/policy';

type PolicyOptions = {
  out?: string;
};

export function registerPolicyCommand(program: Command): void {
  program
    .command('policy')
    .description('Generate an advisory guard policy draft')
    .argument('<file>', 'OpenAPI YAML or JSON file')
    .option('--out <path>', 'Write policy to a file instead of stdout')
    .action(async (filePath: string, options: PolicyOptions) => {
      try {
        const result = await analyzeOpenApi(filePath);
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
