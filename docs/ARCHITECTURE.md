# Architecture

ToolSafe is organized around one central idea: every output should come from the same deterministic `AnalysisResult`.

The code should feel closer to a static analyzer than an application server. Data flows in one direction from a local file or remote URL to normalized operations, findings, risk summaries, scores, reports, and advisory generated artifacts.

## High-Level Flow

1. The CLI receives a local file path or remote URL and command options.
2. The parser validates that the input exists, has a supported extension, and is a supported OpenAPI 3.x document. Remote URLs are fetched before parsing.
3. The normalizer converts OpenAPI operations into stable `NormalizedTool` records.
4. The rule engine runs deterministic checks and emits `Finding` records.
5. The risk classifier adds operation-level risk labels and evidence.
6. The scorer converts findings into category and overall scores.
7. The analyzer assembles everything into `AnalysisResult`.
8. Reporters render that result for humans or machines.
9. Generators can turn that same result into advisory artifacts such as guard policy drafts and eval ideas.

## Module Boundaries

The codebase uses the `@/*` path alias for source imports. `@/core/types` maps to `src/core/types.ts`, and tests use the same alias when importing source modules.

### `src/config`

Config loading, schema validation, and type definitions for `toolsafe.config.json`. The loader auto-detects the file in CWD or loads from an explicit `--config` path. Config applies rule-level filtering and severity overrides to the analysis pipeline.

### `src/cli`

The CLI layer owns command registration, command-specific options, stdout/stderr output, and process exit codes.

It should not own parsing, normalization, scoring, rule logic, or policy logic. Commands call `analyzeOpenApi` (via the shared `withAnalysis` helper in `src/cli/analysis.ts`) and then choose a reporter or generator.

#### `src/cli/analysis.ts`

Shared CLI bootstrap for commands that need to analyze an OpenAPI document with config support. `withAnalysis` wraps `loadConfig` + `analyzeOpenApi` + error handling so command handlers don't duplicate the try/catch pattern. `resolveConfig` provides a consistent CLI > config > default precedence chain.

### `src/parsers`

The parser layer turns a local file path or remote URL into a parsed OpenAPI document plus metadata. Remote URLs are detected by protocol (`http:`, `https:`), fetched, and parsed identically to local files.

It wraps expected user-facing failures in `ToolSafeError` (including `FETCH_ERROR` for network failures) so CLI commands can display stable messages and return exit code 2 for input problems.

### `src/core`

The core layer contains the shared domain model and the main pipeline.

- `types.ts` defines the public internal shapes used across the project.
- `normalize.ts` maps OpenAPI operations into the smaller `NormalizedTool` model.
- `risk.ts` classifies operation risk with explainable heuristics.
- `scoring.ts` calculates deterministic scores from findings.
- `analyze.ts` is the shared orchestration point.
- `suppression.ts` handles `x-toolsafe-ignore` and `x-toolsafe-ignore-all` vendor extensions.
- `errors.ts` defines stable ToolSafe error codes.

When adding a new output, prefer consuming `AnalysisResult` instead of building a separate pipeline.

### `src/rules`

Rules inspect normalized tools and produce findings. They should be pure and deterministic: no file reads, no network calls, no time-based behavior, and no mutation of input tools.

Each rule lives under a category folder. The default registry is `src/rules/index.ts`, and common helper logic belongs in `src/rules/helpers.ts`.

### `src/reporters`

Reporters format an `AnalysisResult`. Available reporters:

- **Terminal** (`terminal.ts`) — concise human-readable lint output with color, score breakdown, and findings grouped by severity.
- **JSON** (`json.ts`) — complete machine-readable representation.
- **Markdown** (`markdown.ts`) — PR-friendly summary.
- **SARIF** (`sarif.ts`) — SARIF 2.1.0 output for GitHub code scanning and GitLab SAST.
- **HTML** (`html.ts`) — standalone HTML report.

### `src/generators`

Generators turn `AnalysisResult` into derived advisory artifacts. They are driven by `toolsafe generate --kind policy|evals`.

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

## Finding Quality

A finding should help an engineer decide what to change. The most useful findings include:

- A stable rule ID.
- A severity that matches the practical risk.
- A category for scoring and grouping.
- Operation identity: tool ID, method, and path.
- A plain-language message.
- A practical recommendation.
- Evidence from the spec or normalized operation.

Avoid findings that require hidden assumptions. If the evidence is weak, keep the rule narrow or lower the severity.

## Heuristic Precision

Rules that infer operation intent should avoid matching arbitrary description prose. ToolSafe uses an intent-text helper that searches operation ID, generated name, method, path, summary, and tags, plus tokenized keyword matching for camelCase and path segments. This keeps rules deterministic while reducing false positives from words that merely appear in long-form documentation.

Some rules add extra structural evidence before reporting:

- Batch findings require collection-shaped inputs.
- Ambiguous external communication verbs (`send`, `message`, `publish`) require recipient-shaped inputs.
- List pagination skips GET paths that end in a path parameter (single-resource lookups).
- `safety/financial-requires-idempotency` focuses on clearer financial action/resource keywords instead of broad `bank`, `credit`, or `debit` matches.
- `schema/string-should-be-enum` no longer flags pattern-constrained strings.

## Risk Summaries

Risk classification is separate from rule findings. It labels operations as low, medium, high, or critical based on HTTP method and recognizable risk keywords.

Risk summaries are meant to help scan an API quickly. They are not a substitute for findings, and they are not a formal security classification.

## Scoring

Scores are calculated from findings using a simple deterministic model:

- Errors carry the largest penalty (10).
- Warnings carry a smaller penalty (4).
- Info findings carry the smallest penalty (1).
- Penalties are averaged across all operations in the spec so scores are comparable regardless of spec size.
- Scores are clamped to a 0-100 range.

Category scores use the same idea but only count findings in that category.

Scores are intentionally not a security grade — just a stable signal for comparing specs and tracking improvement over time.

## Exit Code Contract

The lint command currently uses three exit states:

- `0`: analysis completed and no findings met the configured failure threshold.
- `1`: analysis completed and at least one finding met the configured failure threshold.
- `2`: the input could not be parsed, options were invalid, or another input-level error occurred.

The default threshold is `error`. The resolved threshold follows this precedence: `--fail-on` CLI flag > config `lint.failOn` > built-in default (`error`).

The `report` and `generate` commands return `0` when generation succeeds and `2` for input or parse errors.

## Report Formats

### JSON Report

The JSON report is the complete machine-readable representation. Top-level fields:

- `input`: source file path and OpenAPI info metadata.
- `summary`: operation counts, risk counts, and finding counts.
- `scores`: overall and category scores from 0 to 100.
- `tools`: operation-level risk summaries.
- `findings`: rule findings with evidence and recommendations.

```bash
toolsafe report examples/risky-openapi.yaml --format json
toolsafe report examples/risky-openapi.yaml --format json --out toolsafe-report.json
```

### Markdown Report

A concise PR-friendly summary. Sections: Summary, Scores, High-risk operations, Findings grouped by severity.

```bash
toolsafe report examples/risky-openapi.yaml --format markdown
```

### Terminal Output

The terminal lint report is intentionally shorter than JSON. It shows input metadata, overall score, score breakdown by category, finding counts, high-risk operations, and findings grouped by severity.

`lint` also applies exit-code behavior through `--fail-on warning|error`.

### SARIF (2.1.0)

Static Analysis Results Interchange Format — compatible with GitHub code scanning, GitLab SAST, and other SARIF consumers.

- Full rule metadata in `tool.driver.rules`.
- Each finding as a SARIF result with `error`, `warning`, or `note` level.
- Source file URI and operation snippet in each result location.
- Extra properties for category, tool ID, method, and path.

```bash
toolsafe report api.yaml --format sarif --out results.sarif
```

**Level mapping:** `error` → `error`, `warning` → `warning`, `info` → `note`

### Advisory Generated Artifacts

Policy and eval outputs are YAML, not reports. Both are generated from `AnalysisResult`, but neither should be presented as runtime enforcement or executable conformance testing without a separate runtime integration.

## Adding A New Rule

When adding a rule:

1. Decide whether the check can be made from `NormalizedTool`. If not, consider whether the normalizer should expose one more stable field.
2. Add the rule under the appropriate category folder in `src/rules/`.
3. Use helper functions from `src/rules/helpers.ts` when possible.
4. Add the rule to the default registry only when it is reliable enough for default output.
5. Add focused tests for the rule and update default rule ordering tests if needed.
6. Check whether scoring expectations change.
7. Consider whether the policy generator (`src/generators/policy.ts`) should map the new rule ID to a specific recommended control.
8. Consider adding a matching eval template in `src/generators/evals.ts`.
9. Update `docs/RULES.md` if the default rule metadata changes.

## Future: Smarter Rule Runner

### Current State

`runRules` in `src/rules/index.ts` is a flat double loop:

```
for each tool:
  for each rule:
    rule.check({ tool, allTools })
```

Every rule receives `allTools` but must re-derive any cross-operation context itself. No rule currently uses it.

### Problem

This works for 15 single-operation rules. It will not scale to:

- **Cross-operation rules** (e.g. "two POST operations on the same path must both have idempotency keys")
- **Aggregate rules** (e.g. "more than 50% of operations are missing descriptions")
- **Context-aware rules** (e.g. "this GET returns user data but no other operation in this tag has auth" — needs to know what sibling operations do)

Each of these would force the rule author to re-derive the same cross-operation index (group by path, group by tag, group by security scheme) inside their `check()` function, duplicating work across rules.

### Possible Direction

Decouple the runner from per-rule iteration. Instead of the runner calling `rule.check()`, have rules register what they need:

```ts
export const rule = defineRule({
  id: '...',
  check: (context) => {
    // context.groupedByPath — pre-computed
    // context.groupedByTag — pre-computed
    // context.allTags — pre-computed set
  },
});
```

The runner would:

1. Normalize all tools (already done)
2. Pre-compute cross-operation indices once (path groups, tag groups, method+path pairs)
3. Pass the pre-computed context to every rule

This keeps per-rule `check()` functions pure while eliminating repeated index-building.

### When to Revisit

- When adding the first cross-operation rule
- When a third rule duplicates a `groupBy` pattern already used by another rule
- When the rule count exceeds ~25

Do not implement this before there's concrete evidence of duplication. The current flat loop is simpler and sufficient.

## Future: Full Document Model

### Context

Today ToolSafe sits on top of `@scalar/openapi-parser` for validation and `$ref` resolution, then flattens parsed OpenAPI into a hand-rolled `NormalizedTool` model. Rules interact with `NormalizedTool` fields — `parameters`, `requestBodySchema`, `responses`, `security`, `operation` — plus generic `schema.ts` helpers.

This is pragmatic for 15 rules. But production linters like Vacuum or Speakeasy use a full-fidelity document graph.

### How Production Linters Structure Themselves

Both Speakeasy and Vacuum are built on top of a **Go OpenAPI library** that maintains a full-fidelity document graph:

```
OpenAPI file → parse → full document graph (typed, indexed, resolved)
                          ↓
                    linter engine
                          ↓
                    rule functions
```

The document graph includes a node graph (every YAML/JSON node is addressable), a spec index (pre-computed maps for operations by path, schemas by name, etc.), a typed document model, and `$ref` resolution built into the graph layer.

### Contrast with ToolSafe's Current Model

| Capability           | ToolSafe today                                                 | Speakeasy / Vacuum                         |
| -------------------- | -------------------------------------------------------------- | ------------------------------------------ |
| Document access      | Flattened `NormalizedTool` fields + `operation: unknown` casts | Full typed document tree                   |
| `$ref` resolution    | Post-parse dereference step                                    | Built into the graph layer                 |
| Schema traversal     | `schema.ts` helpers (top-level only)                           | Full schema tree with recursion            |
| Pre-computed indices | None (rules recompute)                                         | `docInfo.getIndex().getOperations()`, etc. |
| Custom rules         | Modify source code                                             | TypeScript files loaded at runtime         |
| JSONPath             | Not supported                                                  | Core to Vacuum's rule model                |
| Line-level output    | Not tracked                                                    | Built into the node graph                  |

### Why This Matters

1. **Rules become simpler and more powerful** — referencing is transparent with a full document model; `response.schema.properties` works regardless of `$ref`.
2. **Cross-operation rules become feasible** — pre-built indices eliminate manual grouping.
3. **A foundation for custom/user-defined rules** — users need the same full document that built-in rules use.
4. **Output quality** — line numbers, column numbers, and auto-fix suggestions require tracking original node positions.

### A Path Forward

This does not mean rewriting ToolSafe today. The current architecture is appropriate for v0.x. The next major structural investment should be:

1. **Build a minimal spec index** — pre-compute `operationsByPath`, `schemasByName`, `operationsByTag` once in the runner, pass to all rules via `RuleContext`
2. **Replace `operation: unknown` with a typed OpenAPI operation type** — use the typed `OpenApiDocumentV3` from `@scalar/openapi-parser`
3. **Add schema depth helpers** — `flattenSchema(schema): SchemaProperty[]` that recursively walks `allOf`/`oneOf`/`$ref`-resolved properties

Steps 2 and 3 unlock most of the benefit without a full architecture rewrite. Step 1 is documented above in "Future: Smarter Rule Runner".

### When to Pivot

Consider a full document graph when:

- Rule count exceeds ~30 and cross-operation patterns emerge
- Custom/user-defined rules become a requested feature
- The `operation: unknown` casts in rules/helpers exceed ~5 distinct accessors
- Performance on 50K+ line specs becomes a concern
