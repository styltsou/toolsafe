# Toolsmith Agent-Readiness Report

Input: `examples/risky-openapi.yaml`

API: Risky Example API 1.0.0

## Summary

| Metric                 | Value |
| ---------------------- | ----: |
| Operations analyzed    |     5 |
| Read-only operations   |     1 |
| Mutating operations    |     4 |
| Destructive operations |     1 |
| High-risk operations   |     3 |
| Errors                 |     1 |
| Warnings               |    14 |
| Info                   |     0 |

## Scores

| Category        |   Score |
| --------------- | ------: |
| Overall         |  34/100 |
| Safety          |  66/100 |
| Schema          |  92/100 |
| Docs            | 100/100 |
| Errors          |  80/100 |
| Agent usability |  96/100 |
| Auth            | 100/100 |

## High-Risk Operations

| Risk | Operation                               | Reasons                                                  |
| ---- | --------------------------------------- | -------------------------------------------------------- |
| high | `POST /emails/send` (sendEmail)         | HTTP method POST can mutate state; Risk keyword: email   |
| high | `POST /payments/charge` (chargePayment) | HTTP method POST can mutate state; Risk keyword: payment |
| high | `DELETE /users/{id}` (deleteUser)       | HTTP method DELETE is destructive                        |

## Findings

### Errors

- **safety/destructive-requires-guard**: `DELETE /users/{id}`
  - Destructive operation does not declare an explicit agent guard or confirmation signal in the API contract.
  - Recommendation: Add a confirmation field, a vendor extension such as x-agent-guard, or a generated guard policy before exposing this operation to autonomous agents.
  - Evidence: HTTP method DELETE

### Warnings

- **errors/missing-error-schema**: `POST /emails/send`
  - Operation does not define a structured 4xx or 5xx error response schema.
  - Recommendation: Define structured error responses with stable error codes and messages so agents can recover safely.
  - Evidence: No 4xx/5xx response with schema

- **safety/external-communication-requires-guard**: `POST /emails/send`
  - External communication operation does not declare a confirmation or guard signal.
  - Recommendation: Add confirmation input or guard metadata before exposing this operation to autonomous agents.
  - Evidence: HTTP method POST; External communication keyword

- **safety/mutating-requires-dry-run**: `POST /emails/send`
  - Mutating operation does not expose dry-run, preview, or validate-only mode.
  - Recommendation: Add dry-run, preview, or validate-only support when possible. Otherwise mark the operation as guarded.
  - Evidence: HTTP method POST

- **errors/missing-error-schema**: `POST /payments/charge`
  - Operation does not define a structured 4xx or 5xx error response schema.
  - Recommendation: Define structured error responses with stable error codes and messages so agents can recover safely.
  - Evidence: No 4xx/5xx response with schema

- **safety/financial-requires-idempotency**: `POST /payments/charge`
  - Financial mutating operation does not expose an idempotency key.
  - Recommendation: Add an idempotency key, request ID, or equivalent deduplication field before exposing this operation to agents.
  - Evidence: HTTP method POST; Financial operation keyword

- **safety/mutating-requires-dry-run**: `POST /payments/charge`
  - Mutating operation does not expose dry-run, preview, or validate-only mode.
  - Recommendation: Add dry-run, preview, or validate-only support when possible. Otherwise mark the operation as guarded.
  - Evidence: HTTP method POST

- **errors/missing-error-schema**: `GET /users`
  - Operation does not define a structured 4xx or 5xx error response schema.
  - Recommendation: Define structured error responses with stable error codes and messages so agents can recover safely.
  - Evidence: No 4xx/5xx response with schema

- **schema/list-requires-pagination**: `GET /users`
  - List/search operation has no pagination or limit query parameter.
  - Recommendation: Expose limit, page, pageSize, cursor, or offset parameters to prevent unbounded agent outputs.
  - Evidence: GET operation appears to return a collection

- **errors/missing-error-schema**: `POST /users`
  - Operation does not define a structured 4xx or 5xx error response schema.
  - Recommendation: Define structured error responses with stable error codes and messages so agents can recover safely.
  - Evidence: No 4xx/5xx response with schema

- **safety/mutating-requires-dry-run**: `POST /users`
  - Mutating operation does not expose dry-run, preview, or validate-only mode.
  - Recommendation: Add dry-run, preview, or validate-only support when possible. Otherwise mark the operation as guarded.
  - Evidence: HTTP method POST

- **schema/string-should-be-enum**: `POST /users`
  - String input 'role' appears constrained but has no enum.
  - Recommendation: Add enum values so agents can choose valid inputs without guessing API-specific strings.
  - Evidence: String input: role

- **schema/vague-boolean**: `POST /users`
  - Boolean input 'force' is too vague for reliable agent use.
  - Recommendation: Rename vague booleans to describe the exact behavior they enable, or replace them with a constrained enum.
  - Evidence: Boolean input: force

- **errors/missing-error-schema**: `DELETE /users/{id}`
  - Operation does not define a structured 4xx or 5xx error response schema.
  - Recommendation: Define structured error responses with stable error codes and messages so agents can recover safely.
  - Evidence: No 4xx/5xx response with schema

- **safety/mutating-requires-dry-run**: `DELETE /users/{id}`
  - Mutating operation does not expose dry-run, preview, or validate-only mode.
  - Recommendation: Add dry-run, preview, or validate-only support when possible. Otherwise mark the operation as guarded.
  - Evidence: HTTP method DELETE
