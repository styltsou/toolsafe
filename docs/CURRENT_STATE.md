# Current State Through Milestone 10

This document describes what is implemented now, not the full product vision.

## Implemented

### Milestone 0: Project Skeleton

The project has a working Bun and TypeScript setup, a Commander-based CLI entrypoint, package scripts, a package bin shape, and smoke tests.

### Milestone 1: OpenAPI Parsing

ToolSafe can parse local `.yaml`, `.yml`, and `.json` OpenAPI files. It supports OpenAPI 3.x and returns stable `ToolSafeError` codes for expected file and parse failures.

Remote URLs and non-OpenAPI local files are outside current scope.

### Milestone 2: Operation Normalization

OpenAPI paths are converted into deterministic `NormalizedTool` records. The normalizer extracts operation IDs, fallback names, HTTP methods, paths, summaries, descriptions, tags, parameters, common request body schemas, common response schemas, security arrays, and the raw operation.

The normalizer is intentionally conservative. It does not attempt full JSON Schema 2020-12 traversal.

### Milestone 3: Rule Engine

The initial default rule engine established five rules:

- `safety/destructive-requires-guard`
- `safety/mutating-requires-dry-run`
- `schema/list-requires-pagination`
- `docs/missing-description`
- `errors/missing-error-schema`

Rules return stable findings sorted by severity, path, method, and rule ID.

### Milestone 4: Analysis And Scoring

`analyzeOpenApi` now runs the complete pipeline and returns `AnalysisResult`. The result includes input metadata, summary counts, category scores, operation risk summaries, and findings.

Risk classification is heuristic and evidence-based. Scores are deterministic and intended as comparison signals, not formal security grades.

### Milestone 5: `toolsafe lint`

The lint command is available and supports:

- Pretty terminal output.
- JSON output.
- `--fail-on warning|error`.
- Exit code 0 for clean or below-threshold results.
- Exit code 1 for threshold findings.
- Exit code 2 for parse, input, or option errors.

The risky example fixture produces useful terminal output and a complete JSON analysis result.

### Milestone 6: JSON And Markdown Reports

The report command is available and supports:

- Markdown output by default.
- JSON output with `--format json`.
- Printing to stdout when `--out` is omitted.
- Writing report files to disk when `--out` is provided.

Both JSON and Markdown report renderers consume the same `AnalysisResult` used by lint. Snapshot tests cover the risky example fixture for both formats.

### Milestone 7: Additional High-Value Rules

The default rule set now has 10 rules. Milestone 7 added:

- `safety/financial-requires-idempotency`
- `safety/external-communication-requires-guard`
- `schema/vague-boolean`
- `schema/string-should-be-enum`
- `schema/sensitive-response-fields`

These rules keep the same deterministic, evidence-based shape as the initial rule set. They inspect operation text, explicit inputs, top-level request schemas, and top-level response schemas.

### Milestone 8: Policy Draft Generator

The policy command is available and supports:

- YAML output to stdout.
- Writing YAML to disk with `--out`.
- A top-level advisory note.
- Operation modes based on risk and safety findings.
- Operation entries with method, path, risk, mode, reasons, and recommended controls.

Policy drafts are generated from the same `AnalysisResult` used by lint and reports. They are not runtime enforcement.

### Milestone 9: Eval Idea Generator

The evals command is available and supports:

- YAML output to stdout.
- Writing YAML to disk with `--out`.
- A top-level advisory note explaining that cases need runtime adaptation.
- Deterministic cases generated from findings.
- Case fields for type, operation ID, method, path, placeholder input, expected behavior, and reason.

Eval ideas are generated from the same `AnalysisResult` used by lint, reports, and policy drafts. They are not executable conformance tests until adapted to a concrete runtime.

### Milestone 10: Public Demo Polish

The project now includes:

- A README centered on the actual CLI.
- A default rule catalog in `docs/RULES.md`.
- Report-format documentation in `docs/REPORT_FORMAT.md`.
- Advisory policy and eval documentation.
- Publishing notes that keep the package private until release scope is explicit.
- Sample outputs under `examples/output/`.
- GitHub Actions CI for typecheck, lint, format check, and tests.

## Not Implemented Yet

The following are planned or mentioned in product docs but are not complete at this point:

- Config files and severity overrides.
- SARIF output.
- Remote URL input.
- Runtime API execution or proxy behavior.
- MCP server generation.
- LLM-based suggestions.
- npm publishing.

## Important Scope Notes

ToolSafe is deterministic and offline-first. Current behavior should be explainable from source code and tests.

Generated findings are static-analysis signals. They should not be presented as proof that a real backend is unsafe or safe.

Confirmation and guard detection are based only on explicit contract signals in the OpenAPI document, such as fields or vendor extensions. ToolSafe cannot know whether an external approval process exists outside the spec.

Policy output is an advisory draft unless a separate runtime component enforces it. Eval output is an advisory set of test ideas unless a project adapts it to a concrete runtime.
