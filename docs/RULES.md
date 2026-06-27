# Rules

Toolsmith currently runs 10 default rules. Rules are deterministic and operate on normalized OpenAPI operations.

## Default Rules

| Rule ID                                        | Severity | Category        | Purpose                                                                                                              |
| ---------------------------------------------- | -------- | --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `safety/destructive-requires-guard`            | error    | safety          | Flags destructive operations without explicit confirmation fields or guard metadata.                                 |
| `safety/financial-requires-idempotency`        | warning  | safety          | Flags financial mutations without an idempotency key or request ID.                                                  |
| `safety/external-communication-requires-guard` | warning  | safety          | Flags email, SMS, notification, invite, webhook, or broadcast operations without confirmation or guard metadata.     |
| `safety/mutating-requires-dry-run`             | warning  | safety          | Flags mutating operations without dry-run, preview, validate-only, or plan-only inputs.                              |
| `schema/list-requires-pagination`              | warning  | agent usability | Flags likely list/search operations without pagination or limit parameters.                                          |
| `schema/vague-boolean`                         | warning  | schema          | Flags vague boolean inputs such as `force` or `flag`.                                                                |
| `schema/string-should-be-enum`                 | warning  | schema          | Flags likely constrained string inputs such as `role`, `status`, or `mode` without enum values.                      |
| `schema/sensitive-response-fields`             | warning  | schema          | Flags response schemas with sensitive top-level fields such as tokens, secrets, credentials, or payment identifiers. |
| `docs/missing-description`                     | warning  | docs            | Flags operations with neither summary nor description.                                                               |
| `errors/missing-error-schema`                  | warning  | errors          | Flags operations without any structured 4xx or 5xx response schema.                                                  |

## Rule Output

Each finding includes:

- Rule ID.
- Severity.
- Category.
- Operation ID, method, and path.
- Message.
- Recommendation.
- Evidence.

## Ordering

Findings are sorted by severity, path, method, and rule ID. This keeps reports stable and makes snapshot tests useful.

## Adding Or Changing Rules

Rule implementations live under `src/rules/`. The default registry is `src/rules/index.ts`.

When a rule changes, update:

- Focused tests in `tests/rules/rules.test.ts`.
- Analysis expectations if finding counts or scores change.
- Report and generated-output snapshots if output changes.
- This document if the default rule metadata changes.
