#!/usr/bin/env bun

import { Command } from 'commander';
import { registerGenerateCommand } from '@/cli/commands/generate';
import { registerInitCommand } from '@/cli/commands/init';
import { registerLintCommand } from '@/cli/commands/lint';
import { registerReportCommand } from '@/cli/commands/report';
import { defaultRules } from '@/rules';
import { generateBashCompletion, generateZshCompletion } from '@/cli/completion';
import pkg from '../../package.json' with { type: 'json' };

const program = new Command();

program
  .name('toolsafe')
  .description('Agent-readiness linting for OpenAPI tools')
  .version(pkg.version);

registerInitCommand(program);
registerLintCommand(program);
registerReportCommand(program);
registerGenerateCommand(program);

program
  .command('rules')
  .description('List available ToolSafe rules')
  .action(() => {
    for (const rule of defaultRules) {
      console.log(`${rule.id}\t${rule.defaultSeverity}\t${rule.category}\t${rule.description}`);
    }
  });

program
  .command('completion')
  .description('Generate shell completion script')
  .argument('[shell]', 'Shell type: bash or zsh')
  .action((shell?: string) => {
    if (shell === 'zsh') {
      console.log(generateZshCompletion());
    } else {
      console.log(generateBashCompletion());
    }
  });

await program.parseAsync(process.argv);
