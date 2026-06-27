# Architecture

Toolsmith is organized around one central idea: every output should come from the same deterministic `AnalysisResult`.

The code should feel closer to a static analyzer than an application server. Data flows in one direction from a local OpenAPI file to normalized operations, findings, risk summaries, scores, reports, and advisory generated artifacts.

## High-Level Flow

1. The CLI receives a local file path and command options.
2. The parser validates that the file exists, has a supported extension, and is a supported OpenAPI 3.x document.
3. The normalizer converts OpenAPI operations into stable `NormalizedTool` records.
4. The rule engine runs deterministic checks and emits `Finding` records.
5. The risk classifier adds operation-level risk labels and evidence.
6. The scorer converts findings into category and overall scores.
7. The analyzer assembles everything into `AnalysisResult`.
8. Reporters render that result for humans or machines.
9. Generators can turn that same result into advisory artifacts such as guard policy drafts and eval ideas.

## Module Boundaries

The codebase uses the `@/*` path alias for source imports. `@/core/types` maps to `src/core/types.ts`, and tests use the same alias when importing source modules.

### `src/cli`

The CLI layer owns command registration, command-specific options, stdout/stderr output, and process exit codes.

It should not own parsing, normalization, scoring, rule logic, or policy logic. Commands call `analyzeOpenApi` and then choose a reporter or generator.

### `src/parsers`

The parser layer turns a local file path into a parsed OpenAPI document plus metadata.

It wraps expected user-facing failures in `ToolsmithError` so CLI commands can display stable messages and return exit code 2 for input problems.

### `src/core`

The core layer contains the shared domain model and the main pipeline.

- `types.ts` defines the public internal shapes used across the project.
- `normalize.ts` maps OpenAPI operations into the smaller `NormalizedTool` model.
- `risk.ts` classifies operation risk with explainable heuristics.
- `scoring.ts` calculates deterministic scores from findings.
- `analyze.ts` is the shared orchestration point.
- `errors.ts` defines stable Toolsmith error codes.

When adding a new output, prefer consuming `AnalysisResult` instead of building a separate pipeline.

### `src/rules`

Rules inspect normalized tools and produce findings. They should be pure and deterministic: no file reads, no network calls, no time-based behavior, and no mutation of input tools.

Each rule lives under a category folder. The default registry is `src/rules/index.ts`, and common helper logic belongs in `src/rules/helpers.ts`.

### `src/reporters`

Reporters format an `AnalysisResult`.

The terminal reporter is intentionally concise. JSON output is the complete machine-readable representation currently available. Markdown output is a PR-friendly summary built from the same result.

### `src/generators`

Generators turn `AnalysisResult` into derived advisory artifacts.

The policy generator creates a YAML guard-policy draft from risk summaries and findings. It includes an explicit advisory note because the generated policy is not enforced unless a runtime guard or proxy implements it.

The eval generator creates YAML eval case ideas from findings. It includes an explicit advisory note because the cases need adaptation to a concrete runtime before they are executable.

### `tests`

The tests mirror the major layers:

- `tests/parsers/` covers file parsing and stable error codes.
- `tests/core/` covers normalization, risk, scoring, and complete analysis.
- `tests/rules/` covers individual rules and default rule ordering.
- `tests/generators/` covers generated advisory artifacts.
- `tests/cli/` covers lint command behavior and exit codes.
- `tests/fixtures/` contains small OpenAPI specs for predictable tests.

## Data Model

`NormalizedTool` is the main internal representation of an OpenAPI operation. It is intentionally smaller than full OpenAPI and includes only what current rules, risk scoring, and reports need.

`Finding` is the rule output contract. A useful finding includes a stable rule ID, severity, category, operation identity, message, recommendation, and evidence.

`AnalysisResult` is the top-level report model. CLI output, JSON output, Markdown output, policy drafts, and eval ideas should all be based on it.

## Exit Code Contract

The lint command currently uses three exit states:

- `0`: analysis completed and no findings met the configured failure threshold.
- `1`: analysis completed and at least one finding met the configured failure threshold.
- `2`: the input could not be parsed, options were invalid, or another input-level error occurred.

The default threshold is `error`. With `--fail-on warning`, warnings and errors both produce exit code 1.

The `report`, `policy`, and `evals` commands return `0` when generation succeeds and `2` for input or parse errors.
