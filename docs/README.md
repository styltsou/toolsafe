# ToolSafe Docs

These notes explain the codebase as it exists through milestone 10. They are meant for engineers who need to understand where the pieces fit before changing behavior.

## Start Here

1. Read [Onboarding](./ONBOARDING.md) for the quickest path through the repo.
2. Read [Architecture](./ARCHITECTURE.md) to understand the analysis pipeline and module boundaries.
3. Read [Current State](./CURRENT_STATE.md) for what exists through milestone 10 and what is intentionally not built yet.
4. Read [Rules And Reports](./RULES_AND_REPORTS.md) when changing lint rules, scoring, output, or exit behavior.
5. Read [Rules](./RULES.md) for the current default rule catalog.
6. Read [Report Format](./REPORT_FORMAT.md) for JSON, Markdown, and terminal output shape.
7. Read [Policy Generation](./POLICY_GENERATION.md) when changing advisory guard-policy output.
8. Read [Eval Generation](./EVAL_GENERATION.md) when changing advisory eval ideas.
9. Read [Publishing Notes](./PUBLISHING.md) before changing package publishing settings.

## Primary Entry Points

- CLI entrypoint: `src/cli/index.ts`
- Lint command: `src/cli/commands/lint.ts`
- Report command: `src/cli/commands/report.ts`
- Policy command: `src/cli/commands/policy.ts`
- Evals command: `src/cli/commands/evals.ts`
- Analysis pipeline: `src/core/analyze.ts`
- Policy generator: `src/generators/policy.ts`
- Eval generator: `src/generators/evals.ts`
- Shared data model: `src/core/types.ts`
- Default rule registry: `src/rules/index.ts`
- Test suite: `tests/`

## Useful Commands

- Install dependencies: `bun install`
- Run the CLI: `bun run src/cli/index.ts --help`
- Run lint output: `bun run src/cli/index.ts lint examples/risky-openapi.yaml`
- Generate a policy draft: `bun run src/cli/index.ts policy examples/risky-openapi.yaml`
- Generate eval ideas: `bun run src/cli/index.ts evals examples/risky-openapi.yaml`
- Inspect sample outputs: `examples/output/`
- Regenerate sample outputs: `bun run examples:generate`
- Run tests: `bun test`
- Run typecheck: `bun run typecheck`
- Run full local checks: `bun run check`
