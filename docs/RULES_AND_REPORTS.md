# Rules And Reports

This guide explains how lint rules, risk summaries, scores, and reports fit together.

## Rule Shape

A rule receives a `RuleContext` containing the current `NormalizedTool` and the full list of normalized tools. It returns zero or more `Finding` records.

Rules should be:

- Deterministic.
- Easy to explain from evidence.
- Focused on one concern.
- Conservative about inference.
- Tested with small fixtures or direct `NormalizedTool` values.

Rules should not:

- Read files.
- Call networks.
- Depend on time.
- Mutate tools.
- Format terminal or JSON output.

## Current Rule Set

The current default rules cover 15 reliable checks:

- Destructive DELETE or mutating operations should declare an explicit agent guard or confirmation signal.
- Financial mutations should expose idempotency or deduplication inputs.
- External-recipient operations should declare confirmation or guard signals.
- Mutating operations should expose dry-run, preview, or validate-only behavior when possible.
- Batch operations with collection-shaped inputs should expose limits.
- Likely collection GET operations should expose pagination or limit parameters.
- Vague boolean inputs should be renamed or replaced with constrained values.
- Likely constrained string inputs should expose enum values or another explicit pattern.
- Sensitive response fields should be redacted or explicitly reviewed.
- File uploads should expose size or content constraints.
- Broad auth scopes should be narrowed or reviewed.
- Operations should have summary or description text.
- Weak descriptions should be expanded.
- Mutating operation descriptions should mention side effects.
- Operations should define structured 4xx or 5xx error response schemas.

The rule registry in `src/rules/index.ts` defines which rules run by default. Tests assert stable default finding order for the risky example.

## Heuristic Precision

Rules that infer operation intent should avoid matching arbitrary description prose. ToolSafe now provides an intent-text helper that searches operation ID, generated name, method, path, summary, and tags, plus tokenized keyword matching for camelCase and path segments. This keeps rules deterministic while reducing false positives from words that merely appear in long-form documentation.

Some rules add extra structural evidence before reporting. Batch findings require collection-shaped inputs, ambiguous external communication verbs require recipient-shaped inputs, and list pagination skips GET paths that end in a path parameter because those usually represent single-resource lookups.

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

## Risk Summaries

Risk classification is separate from rule findings. It labels operations as low, medium, high, or critical based on HTTP method and recognizable risk keywords.

Risk summaries are meant to help scan an API quickly. They are not a substitute for findings, and they are not a formal security classification.

## Scoring

Scores are calculated from findings. The scoring model is intentionally simple so it remains predictable:

- Errors carry the largest penalty.
- Warnings carry a smaller penalty.
- Info findings carry the smallest penalty.
- Penalties are averaged across all operations in the spec so scores are comparable regardless of spec size.
- Scores are clamped to a 0-100 range.

Category scores use the same idea but only count findings in that category.

## Reporters

Reporters consume `AnalysisResult`.

The terminal reporter focuses on the human lint experience: summary, high-risk operations, then findings grouped by severity.

The JSON reporter prints the full `AnalysisResult` as stable pretty JSON. This is the best output for tools, tests, and downstream automation at milestone 5.

The Markdown reporter provides a concise PR-friendly report without changing the analysis pipeline.

## Adding A New Rule

When adding a rule:

1. Decide whether the check can be made from `NormalizedTool`. If not, consider whether the normalizer should expose one more stable field.
2. Add the rule under the appropriate category folder.
3. Use helper functions from `src/rules/helpers.ts` when possible.
4. Add the rule to the default registry only when it is reliable enough for default output.
5. Add focused tests for the rule and update default rule ordering tests if needed.
6. Check whether scoring expectations change.

Prefer one reliable rule over several noisy rules.

## Changing Output

For terminal output changes, update CLI or reporter tests depending on the behavior being changed.

For JSON output changes, first decide whether the data belongs in `AnalysisResult`. JSON should not have separate hidden computation.

For Markdown report changes, keep the report concise and PR-friendly. Detailed machine-readable data should stay in JSON.
