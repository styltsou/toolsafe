#!/usr/bin/env bun

import { Command } from 'commander';
import { registerEvalsCommand } from '@/cli/commands/evals';
import { registerLintCommand } from '@/cli/commands/lint';
import { registerPolicyCommand } from '@/cli/commands/policy';
import { registerReportCommand } from '@/cli/commands/report';
import { TOOLSAFE_VERSION } from '@/core/constants';
import { defaultRules } from '@/rules';

const program = new Command();

program
  .name('toolsafe')
  .description('Agent-readiness linting for OpenAPI tools')
  .version(TOOLSAFE_VERSION);

registerLintCommand(program);
registerReportCommand(program);
registerPolicyCommand(program);
registerEvalsCommand(program);

program
  .command('rules')
  .description('List available ToolSafe rules')
  .action(() => {
    for (const rule of defaultRules) {
      console.log(`${rule.id}\t${rule.defaultSeverity}\t${rule.category}\t${rule.description}`);
    }
  });

await program.parseAsync(process.argv);
