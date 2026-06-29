# Rules

ToolSafe currently runs 15 default rules. Rules are deterministic and operate on normalized OpenAPI operations.

## Default Rules

| Rule ID                                           | Severity | Category        | Purpose                                                                                                              |
| ------------------------------------------------- | -------- | --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `safety/destructive-requires-guard`               | error    | safety          | Flags DELETE or mutating destructive operations without explicit confirmation fields or guard metadata.              |
| `safety/batch-operation-requires-limit`           | warning  | safety          | Flags batch or bulk operations with collection-shaped inputs but no limit or max items parameter.                    |
| `auth/dangerous-auth-scope`                       | warning  | auth            | Flags security requirements with overly broad or dangerous scopes.                                                   |
| `safety/financial-requires-idempotency`           | warning  | safety          | Flags mutating payment, refund, transfer, payout, invoice, billing, or subscription operations without idempotency.  |
| `safety/external-communication-requires-guard`    | warning  | safety          | Flags likely external-recipient operations without confirmation or guard metadata.                                   |
| `safety/mutating-requires-dry-run`                | warning  | safety          | Flags mutating operations without dry-run, preview, validate-only, or plan-only inputs.                              |
| `schema/list-requires-pagination`                 | warning  | agent usability | Flags likely collection GET operations without pagination or limit parameters.                                       |
| `schema/unconstrained-file-upload`                | warning  | schema          | Flags file upload inputs that lack size or content constraints.                                                      |
| `schema/vague-boolean`                            | warning  | schema          | Flags vague boolean inputs such as `force` or `flag`.                                                                |
| `schema/string-should-be-enum`                    | warning  | schema          | Flags likely constrained string inputs such as `role`, `status`, or `mode` without enum values or another pattern.   |
| `schema/sensitive-response-fields`                | warning  | schema          | Flags response schemas with sensitive top-level fields such as tokens, secrets, credentials, or payment identifiers. |
| `docs/missing-description`                        | warning  | docs            | Flags operations with neither summary nor description.                                                               |
| `docs/weak-description`                           | info     | docs            | Flags descriptions that are too short or contain generic placeholder text.                                           |
| `docs/mutating-description-mentions-side-effects` | warning  | docs            | Flags mutating operations whose descriptions lack mention of side effects.                                           |
| `errors/missing-error-schema`                     | warning  | errors          | Flags operations without any structured 4xx or 5xx response schema.                                                  |

## Matching Precision

Safety and usability rules use operation intent text: operation ID, generated name, method, path, summary, and tags. They intentionally ignore long-form description prose so incidental words in documentation do not trigger findings.

Keyword checks tokenize camelCase names and path segments before matching. For example, `GET /subscriptions/{id}/cancellation-history` does not satisfy the destructive rule just because it contains `cancellation`, and ambiguous external communication verbs such as `send`, `message`, or `publish` need recipient-shaped inputs before they are treated as external communication.

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

## Inline Suppression

Operations can suppress specific rules or all rules using vendor extensions in the OpenAPI spec. This allows teams to adopt ToolSafe incrementally — mark known/accepted findings so CI can go green while remaining findings are addressed.

### Suppress specific rules

Add `x-toolsafe-ignore` as a vendor extension on an operation with a list of rule IDs to suppress:

```yaml
/users/{id}:
  delete:
    operationId: deleteUser
    x-toolsafe-ignore:
      - safety/destructive-requires-guard
    responses:
      '204':
        description: Deleted
```

Only findings whose rule ID appears in the list are suppressed for that operation.

### Suppress all rules on an operation

Add `x-toolsafe-ignore-all: true` to suppress every finding for that operation:

```yaml
/users/{id}:
  delete:
    operationId: deleteUser
    x-toolsafe-ignore-all: true
    responses:
      '204':
        description: Deleted
```

### Scope

Both extensions apply at the operation level only. They are not inherited from the root or path-level OpenAPI objects. Findings for operations without these extensions are unaffected.

Suppression is applied after rule execution and after severity overrides from `toolsafe.config.json`, so a suppressed finding never appears in the output regardless of its configured severity.

## Adding Or Changing Rules

Rule implementations live under `src/rules/`. The default registry is `src/rules/index.ts`.

When a rule changes, update:

- Focused tests in `tests/rules/rules.test.ts`.
- Analysis expectations if finding counts or scores change.
- Report and generated-output snapshots if output changes.
- `docs/ARCHITECTURE.md` if the heuristic precision or finding quality guidance changes.
- `docs/RULES.md` if the default rule metadata changes.
- `docs/GENERATION.md` if the mapping from rule IDs to policy controls or eval templates changes.
