# Onboarding

This guide is for an engineer opening ToolSafe for the first time. The fastest way to understand the project is to follow the data from CLI input to final output.

## What ToolSafe Does

ToolSafe is a deterministic OpenAPI analyzer for agent-readiness. It reads a local OpenAPI 3.x YAML or JSON file, normalizes each API operation into a tool-like model, runs static rules, classifies operation risk, calculates scores, prints reports, and can generate advisory policy drafts and eval ideas.

It does not call the target API, use an LLM, enforce runtime policy, or generate an MCP server in the current implementation.

## First 30 Minutes

1. Run `bun test` to make sure the local environment matches the repo.
2. Run `bun run src/cli/index.ts init --analyze` to scaffold config and discover OpenAPI specs in the project.
3. Run `bun run src/cli/index.ts lint examples/risky-openapi.yaml` and look at the grouped terminal output.
4. Run the same command with `--format json` and compare the output to the `AnalysisResult` type in `src/core/types.ts`.
5. Run `bun run src/cli/index.ts policy examples/risky-openapi.yaml` and note the advisory language at the top.
6. Run `bun run src/cli/index.ts evals examples/risky-openapi.yaml` and note the placeholder inputs.
7. Inspect `examples/output/` to see generated sample files.
8. Open `src/core/analyze.ts` and follow the pipeline calls in order.
9. Open `tests/core/analyze.test.ts` to see the expected shape of the complete analysis result.

## How To Navigate The Source

Internal TypeScript imports use the `@/*` path alias for `src/*`. For example, core modules are imported as `@/core/...` instead of walking directories with relative paths.

Start with the CLI only to understand command behavior:

- `src/cli/index.ts` creates the Commander program and registers commands.
- `src/cli/commands/init.ts` scaffolds `toolsafe.config.json` and a CI workflow; `--analyze` discovers and lints OpenAPI specs.
- `src/cli/commands/lint.ts` owns lint-specific options, output format selection, threshold handling, and exit codes.
- `src/cli/commands/report.ts` owns JSON/Markdown report output and file writing.
- `src/cli/commands/generate.ts` owns advisory policy and eval output and file writing.

Then move into the core pipeline:

- `src/parsers/openapi.ts` handles local file validation, parser integration, and stable ToolSafe errors.
- `src/core/normalize.ts` converts OpenAPI paths and operations into `NormalizedTool[]`.
- `src/rules/index.ts` runs the default rule set against normalized tools.
- `src/core/risk.ts` classifies each tool using deterministic method and keyword heuristics.
- `src/core/scoring.ts` calculates overall and category scores from findings.
- `src/core/analyze.ts` connects all of those pieces and returns one `AnalysisResult`.

Finally, look at output modules:

- `src/reporters/terminal.ts` renders concise human-readable lint output.
- `src/reporters/json.ts` renders stable pretty JSON from the same analysis result.
- `src/reporters/markdown.ts` renders concise PR-friendly reports from the same analysis result.
- `src/generators/policy.ts` turns the same analysis result into advisory guard-policy YAML.
- `src/generators/evals.ts` turns the same analysis result into advisory eval-case YAML.

## How To Make A Change Safely

For parser or normalization changes, start with fixtures under `tests/fixtures/` and tests under `tests/parsers/` or `tests/core/normalize.test.ts`.

For rule changes, update or add tests in `tests/rules/rules.test.ts`. Rules should remain deterministic, shallow, and explainable until there is a clear reason to broaden schema traversal.

For CLI behavior changes, update `tests/cli/lint.test.ts`. The CLI tests cover the most important milestone 5 contract: output mode, thresholds, and exit codes.

For report changes, prefer changing renderers only after checking whether the data should instead belong in `AnalysisResult`. Reporters should format analysis data, not recompute analysis.

For policy changes, update `src/generators/policy.ts` and `tests/generators/policy.test.ts`. Policy generation should remain advisory and based on `AnalysisResult`.

For eval changes, update `src/generators/evals.ts` and `tests/generators/evals.test.ts`. Eval ideas should avoid inventing target-specific IDs, auth, fixtures, or exact error codes.

For demo output changes, run `bun run examples:generate` so `examples/output/` stays synchronized.

## Things To Avoid

- Do not make CLI commands parse OpenAPI directly when `analyzeOpenApi` already provides the shared pipeline.
- Do not add network access to parser or analyzer behavior. v0 is local-file only.
- Do not put rule-specific business logic in reporters.
- Do not make generated output claim runtime enforcement or executable test certainty. Policy and eval generation are advisory.
- Do not replace deterministic checks with LLM calls.
