# Advisory Generation

ToolSafe can generate deterministic advisory artifacts from the same `AnalysisResult` used by lint and reports. Generation is driven by `toolsafe generate --kind policy|evals`.

Both outputs are advisory drafts, not runtime enforcement or executable conformance tests.

## Policy Drafts

Generate an advisory guard policy draft from risk summaries and findings.

```bash
# Generate to stdout
toolsafe generate --kind policy path/to/openapi.yaml

# Write to disk
toolsafe generate --kind policy path/to/openapi.yaml --out guard-policy.yaml

# With explicit config
toolsafe generate --kind policy path/to/openapi.yaml --config toolsafe.config.json
```

### Policy Shape

The generated YAML includes:

- `version`
- `advisory` — a top-level note explaining that runtime enforcement is required
- Source file metadata
- Default mode
- One operation entry per analyzed operation

Each operation entry includes:

- Operation ID
- HTTP method and path
- Risk level
- Suggested mode
- Reasons
- Recommended controls

### Modes

Policy modes are deterministic recommendations:

- `allow`: no risk or safety signal requires stronger handling.
- `require_review`: medium risk or safety warning signals suggest review before autonomous use.
- `require_confirmation`: high or critical risk, or safety errors, suggest explicit confirmation before execution.

### Controls

Recommended controls are derived from rule findings and risk:

- Destructive operations get confirmation-oriented controls.
- Financial mutations get idempotency controls.
- External communication operations get recipient-review controls.
- Unbounded list operations get default-limit controls.
- Sensitive response fields get redaction controls.

## Eval Case Ideas

Generate advisory eval case ideas from findings.

```bash
# Generate to stdout
toolsafe generate --kind evals path/to/openapi.yaml

# Write to disk
toolsafe generate --kind evals path/to/openapi.yaml --out toolsafe.evals.yaml

# With explicit config
toolsafe generate --kind evals path/to/openapi.yaml --config toolsafe.config.json
```

### Eval Shape

The generated YAML includes:

- `version`
- `advisory` — a top-level note explaining that cases need runtime adaptation
- Source file metadata
- A list of cases

Each case includes:

- `type`
- `operationId`
- HTTP method and path
- Placeholder input
- Expected behavior
- Reason

### What the Cases Mean

Cases are recommended checks, not claims about actual backend behavior:

- A destructive operation finding becomes a confirmation-required eval idea.
- A missing error-schema finding becomes a structured-error eval idea.
- A list pagination finding becomes a result-limit eval idea.
- A sensitive-response finding becomes a redaction eval idea.

Inputs use placeholders where ToolSafe cannot know real IDs, auth, request fixtures, or expected error codes from static OpenAPI analysis alone.

## Source of Truth

Both generators start from `analyzeOpenApi`. This keeps them aligned with the same findings, risk summaries, and scores shown by lint and reports.

- Policy implementation: `src/generators/policy.ts`
- Eval implementation: `src/generators/evals.ts`
- CLI wrapper: `src/cli/commands/generate.ts`

## Extending

When adding a new rule, consider:

1. Whether the policy generator should map the new rule ID to a specific recommended control.
2. Adding a matching eval template in `src/generators/evals.ts`. Keep templates generic unless the analysis result contains enough evidence to be more specific.
