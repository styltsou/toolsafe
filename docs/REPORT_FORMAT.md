# Report Format

ToolSafe reports are generated from `AnalysisResult`, the shared output of `analyzeOpenApi`.

## JSON Report

The JSON report is the complete machine-readable representation currently exposed by ToolSafe.

Top-level fields:

- `input`: source file path and OpenAPI info metadata.
- `summary`: operation counts, risk counts, and finding counts.
- `scores`: overall and category scores from 0 to 100.
- `tools`: operation-level risk summaries.
- `findings`: rule findings with evidence and recommendations.

Generate JSON:

```bash
bun run src/cli/index.ts report examples/risky-openapi.yaml --format json
```

Write JSON:

```bash
bun run src/cli/index.ts report examples/risky-openapi.yaml --format json --out toolsafe-report.json
```

## Markdown Report

The Markdown report is a concise PR-friendly summary of the same `AnalysisResult`.

Sections:

- Summary.
- Scores.
- High-risk operations.
- Findings grouped by severity.

Generate Markdown:

```bash
bun run src/cli/index.ts report examples/risky-openapi.yaml --format markdown
```

## Lint Terminal Output

The terminal lint report is intentionally shorter than JSON. It focuses on:

- Input metadata.
- Overall score.
- Finding counts.
- High-risk operations.
- Findings grouped by errors, warnings, and info.

`lint` also applies exit-code behavior through `--fail-on warning|error`.

## Advisory Generated Artifacts

Policy and eval outputs are YAML, not reports.

- Policy output is an advisory guard-policy draft.
- Eval output is an advisory list of test ideas.

Both are generated from `AnalysisResult`, but neither should be presented as runtime enforcement or executable conformance testing without a separate runtime integration.
