# Policy Generation

Toolsmith can generate an advisory guard policy draft from the same `AnalysisResult` used by lint and reports.

The policy output is intentionally not an enforcement mechanism. It is a structured recommendation file that a future runtime guard, proxy, generated server, or MCP layer could choose to enforce.

## Command

Generate YAML to stdout:

```bash
bun run src/cli/index.ts policy examples/risky-openapi.yaml
```

Write YAML to disk:

```bash
bun run src/cli/index.ts policy examples/risky-openapi.yaml --out guard-policy.yaml
```

## Source Of Truth

Policy generation starts from `analyzeOpenApi`, not from a separate parser path. That keeps lint output, reports, scoring, risk summaries, and policy drafts aligned.

The implementation lives in `src/generators/policy.ts`. The CLI wrapper lives in `src/cli/commands/policy.ts`.

## Policy Shape

The generated policy includes:

- `version`
- `advisory`
- A top-level note explaining that runtime enforcement is required.
- Source file metadata.
- Default mode.
- One operation entry per analyzed operation.

Each operation entry includes:

- Operation ID.
- HTTP method and path.
- Risk level.
- Suggested mode.
- Reasons.
- Recommended controls.

## Modes

Policy modes are deterministic recommendations:

- `allow`: no risk or safety signal requires stronger handling.
- `require_review`: medium risk or safety warning signals suggest review before autonomous use.
- `require_confirmation`: high or critical risk, or safety errors, suggest explicit confirmation before execution.

These modes are draft recommendations. They do not prove the backend is safe or unsafe, and they do not enforce behavior by themselves.

## Controls

Recommended controls are derived from rule findings and risk. For example:

- Destructive operations get confirmation-oriented controls.
- Financial mutations get idempotency controls.
- External communication operations get recipient-review controls.
- Unbounded list operations get default-limit controls.
- Sensitive response fields get redaction controls.

When adding new rules, consider whether policy generation should map the new rule ID to a specific recommended control.
