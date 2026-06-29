# ToolSafe Docs

These notes explain the codebase and are meant for engineers who need to understand where the pieces fit before changing behavior.

## Start Here

1. [Onboarding](./ONBOARDING.md) — quickest path through the repo for first-time readers.
2. [Architecture](./ARCHITECTURE.md) — pipeline, module boundaries, data model, scoring, report formats, and future directions.
3. [Current State](./CURRENT_STATE.md) — what exists and what is intentionally not built yet.
4. [Rules](./RULES.md) — the full default rule catalog with matching precision and inline suppression.
5. [Generation](./GENERATION.md) — advisory guard policy and eval case generation.

## Primary Entry Points

- CLI entrypoint: `src/cli/index.ts`
- Init command: `src/cli/commands/init.ts`
- Lint command: `src/cli/commands/lint.ts`
- Report command: `src/cli/commands/report.ts`
- Generate command: `src/cli/commands/generate.ts`
- Analysis pipeline: `src/core/analyze.ts`
- Policy generator: `src/generators/policy.ts`
- Eval generator: `src/generators/evals.ts`
- Shared data model: `src/core/types.ts`
- Default rule registry: `src/rules/index.ts`
- Test suite: `tests/`

## Useful Commands

- Install dependencies: `bun install`
- Run the CLI: `bun run src/cli/index.ts --help`
- Bootstrap a new repo: `bun run src/cli/index.ts init`
- Bootstrap and analyze: `bun run src/cli/index.ts init --analyze`
- Run lint output: `bun run src/cli/index.ts lint examples/risky-openapi.yaml`
- Generate a policy draft: `bun run src/cli/index.ts generate --kind policy examples/risky-openapi.yaml`
- Generate eval ideas: `bun run src/cli/index.ts generate --kind evals examples/risky-openapi.yaml`
- Inspect sample outputs: `examples/output/`
- Regenerate sample outputs: `bun run examples:generate`
- Run tests: `bun test`
- Run typecheck: `bun run typecheck`
- Run full local checks: `bun run check`
