# Eval Generation

ToolSafe can generate deterministic eval case ideas from the same `AnalysisResult` used by lint, reports, and policy drafts.

The output is advisory. It is not an executable test suite until a project adapts it to a concrete runtime, authentication model, fixtures, and expected error format.

## Command

Generate YAML to stdout:

```bash
bun run src/cli/index.ts evals examples/risky-openapi.yaml
```

Write YAML to disk:

```bash
bun run src/cli/index.ts evals examples/risky-openapi.yaml --out toolsafe.evals.yaml
```

## Source Of Truth

Eval generation starts from `analyzeOpenApi`. This keeps eval ideas aligned with the same findings, risk summaries, and scores shown by lint and reports.

The implementation lives in `src/generators/evals.ts`. The CLI wrapper lives in `src/cli/commands/evals.ts`.

## Output Shape

The generated YAML includes:

- `version`
- `advisory`
- A top-level note explaining that cases need runtime adaptation.
- Source file metadata.
- A list of cases.

Each case includes:

- `type`
- `operationId`
- HTTP method and path.
- Placeholder input.
- Expected behavior.
- Reason.

## What The Cases Mean

Cases are recommended checks, not claims about actual backend behavior. For example:

- A destructive operation finding becomes a confirmation-required eval idea.
- A missing error-schema finding becomes a structured-error eval idea.
- A list pagination finding becomes a result-limit eval idea.
- A sensitive-response finding becomes a redaction eval idea.

Inputs use placeholders where ToolSafe cannot know real IDs, auth, request fixtures, or expected error codes from static OpenAPI analysis alone.

## Extending

When adding a rule, consider adding a matching eval template in `src/generators/evals.ts`. Keep templates generic unless the analysis result contains enough evidence to be more specific.
