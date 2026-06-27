# Toolsmith PRD — Agent-Readiness Linter for OpenAPI Tools

## 1. Product Summary

Toolsmith is a deterministic, offline-first developer tool that analyzes OpenAPI specifications and scores how safe, usable, and reliable their API operations are as tools for AI agents.

The goal is not to build an AI agent and not to depend on an LLM API. Toolsmith works like ESLint, Semgrep, or a static analyzer: it parses an OpenAPI file, normalizes operations into a tool-like internal model, runs deterministic lint rules, and outputs structured findings, risk reports, generated eval cases, and optional guard policies.

Toolsmith answers questions like:

- Which API operations are safe for agents to call autonomously?
- Which operations mutate state?
- Which operations are destructive or externally side-effectful?
- Which operations lack dry-run, confirmation, limits, or structured error responses?
- Which schemas are ambiguous or poorly suited for agent use?
- Which eval cases should exist before exposing this API to an agent?
- What guard policy should be placed in front of these tools?

The initial version should focus on OpenAPI 3.x input and CLI output. No LLM is required.

## 2. Product Positioning

### One-line positioning

Toolsmith is an agent-readiness linter for OpenAPI APIs.

### Longer positioning

As more applications expose APIs as tools for AI agents through MCP, function calling, OpenAPI tool importers, and custom agent frameworks, the hard problem is no longer only “can an agent call this API?” The harder problem is “should an agent call this API, and under what constraints?”

Toolsmith provides a deterministic analysis layer that helps developers inspect an API before turning it into agent tools. It detects risky operations, missing safety affordances, weak schemas, ambiguous parameters, poor error contracts, and unbounded outputs.

### What Toolsmith is

- A CLI-first TypeScript/Bun tool.
- A static analyzer for OpenAPI specs.
- A rule engine for agent-safety and tool-design issues.
- A report generator.
- A deterministic eval generator.
- A future foundation for MCP guard policy generation.

### What Toolsmith is not

- It is not an AI agent.
- It does not need an LLM API.
- It does not call the target API.
- It does not execute actions.
- It does not guarantee full semantic understanding of an API.
- It does not replace proper security review.
- It does not need to generate perfect MCP servers in v0.

## 3. Primary User

The primary user is a developer, platform engineer, AI engineer, or startup founder who wants to expose an existing API to agents safely.

Example users:

1. A developer building an MCP server from an existing SaaS API.
2. A startup team importing OpenAPI specs into an agent framework.
3. A backend engineer reviewing whether internal APIs are agent-ready.
4. A platform team creating guardrails for autonomous tool calls.
5. A developer building portfolio-quality agent infrastructure tools.

## 4. Core Use Cases

### Use Case 1: Lint an OpenAPI file

User runs:

```bash
toolsmith lint ./openapi.yaml
```

Toolsmith prints human-readable findings:

```txt
Toolsmith Agent-Readiness Report

Input: ./openapi.yaml
Operations analyzed: 42
Overall score: 74/100

High-risk operations:
  ERROR  DELETE /users/{id}
         Destructive operation has no explicit agent guard signal in the API contract.

  ERROR  POST /payments/charge
         External financial side effect without dry-run or idempotency key.

Warnings:
  WARN   GET /customers
         List operation has no limit or pagination parameter.

  WARN   PATCH /users/{id}
         Mutating operation does not expose dryRun, preview, or validateOnly.

  WARN   POST /emails/send
         External communication side effect requires confirmation or guard policy.
```

### Use Case 2: Generate JSON report

User runs:

```bash
toolsmith report ./openapi.yaml --format json --out toolsmith-report.json
```

Output contains summary, operation-level risks, findings, category scores, and recommendations.

### Use Case 3: Generate Markdown report

User runs:

```bash
toolsmith report ./openapi.yaml --format markdown --out TOOLSMITH_REPORT.md
```

This creates a portfolio-friendly and PR-friendly report.

### Use Case 4: Generate deterministic eval cases

User runs:

```bash
toolsmith evals ./openapi.yaml --out toolsmith.evals.yaml
```

Toolsmith generates test cases based on schemas and risk rules, such as:

- Missing required field tests.
- Invalid enum tests.
- Destructive operation should require confirmation.
- List operation should enforce max limit.
- Mutating operation should support dry-run or be marked guarded.
- Sensitive output fields should be redacted or explicitly reviewed.

### Use Case 5: Generate guard policy

User runs:

```bash
toolsmith policy ./openapi.yaml --out guard-policy.yaml
```

Toolsmith generates a suggested policy file that could later be used by an MCP proxy or tool-execution guard.

Example:

```yaml
version: 1
default: allow
operations:
  deleteUser:
    risk: high
    mode: require_confirmation
    reasons:
      - Uses DELETE method
      - Destructive path term: users/{id}
  chargePayment:
    risk: high
    mode: require_confirmation
    reasons:
      - Financial side effect
      - Missing idempotency key
  listCustomers:
    risk: low
    mode: allow
    limits:
      maxRows: 100
```

## 5. MVP Scope

The MVP should be small but polished.

### Inputs

Support:

- OpenAPI 3.0.x
- OpenAPI 3.1.x
- YAML files
- JSON files
- Local file paths only

Do not support remote URLs in v0 unless trivial.

### Core commands

Implement these commands:

```bash
toolsmith lint <file>
toolsmith report <file> --format json|markdown --out <path>
toolsmith evals <file> --out <path>
toolsmith policy <file> --out <path>
toolsmith rules
toolsmith version
```

### Optional nice-to-have commands

These can be added after MVP:

```bash
toolsmith inspect <file>
toolsmith score <file>
toolsmith explain-rule <rule-id>
```

### MVP outputs

Support:

- Pretty terminal output.
- JSON report.
- Markdown report.
- YAML evals.
- YAML guard policy.

### Non-goals for MVP

Do not build these in v0:

- Web UI.
- MCP server.
- OpenAPI-to-MCP full code generator.
- LLM-based recommendations.
- Remote API execution.
- Runtime proxy.
- Authentication to target APIs.
- Complex semantic workflow generation.
- Multi-file OpenAPI project support beyond what the parser library can resolve.

### MVP reality check and scope corrections

The strongest v0 product is the linter. Reports, eval suggestions, and guard policy generation should be built on top of the same deterministic analysis result, but they should not pretend to be authoritative runtime enforcement.

Important scope corrections:

- Generated evals are recommended test ideas, not executable conformance tests. They become executable only after a project maps Toolsmith operation IDs and expected errors to a real test runner or guard runtime.
- Generated policies are advisory policy drafts. They should include enough metadata to help a future MCP proxy or OpenAPI-to-MCP generator, but v0 should not claim that the policy is enforceable by itself.
- Confirmation is not usually a native OpenAPI concept. Toolsmith can only detect explicit confirmation or guard signals in the spec, such as a `confirm` field, a custom `x-agent-guard` extension, or a generated policy rule. It should not claim to know whether the real backend has an out-of-band approval flow.
- Risk classification is heuristic. Every operation-level risk should carry evidence and, where useful, a confidence value so users can understand why Toolsmith flagged it.
- OpenAPI 3.1 support can be accepted by the parser in v0, but deep JSON Schema 2020-12 behavior should be explicitly out of scope. Toolsmith should traverse common object, array, enum, required, and response-schema shapes first.
- Rule output quality matters more than rule count. Five reliable rules with good evidence are more useful than fifteen noisy rules.
- A config file is useful, but should not block the first alpha. Default deterministic behavior should work without configuration.
- The terminal report should be concise. Detailed data belongs in JSON and Markdown reports.

## 6. Technical Stack

Use:

- TypeScript
- Bun runtime
- Bun package manager
- Bun test
- Commander or CAC for CLI commands
- `yaml` package for YAML parsing/serialization
- `@scalar/openapi-parser` for modern OpenAPI validation, including OpenAPI 3.1
- `zod` for internal data validation
- Optional `kleur`, `picocolors`, or `chalk` for terminal colors
- Optional `ora` only if needed, but avoid unnecessary CLI fanciness in v0

Recommended package choices:

```bash
bun add commander yaml @scalar/openapi-parser zod picocolors
bun add -d typescript @types/node
```

Alternative to Commander:

```bash
bun add cac
```

Commander is boring and stable. CAC is lighter. Either is acceptable.

## 7. Repository Structure

Start with a single package repository, not a monorepo.

Recommended structure:

```txt
toolsmith/
  README.md
  package.json
  tsconfig.json
  bun.lock
  src/
    cli/
      index.ts
      commands/
        lint.ts
        report.ts
        evals.ts
        policy.ts
        rules.ts
        version.ts
    core/
      analyze.ts
      normalize.ts
      scoring.ts
      types.ts
      constants.ts
    parsers/
      openapi.ts
    rules/
      index.ts
      types.ts
      safety/
        destructive-requires-guard.ts
        mutating-requires-dry-run.ts
        external-side-effect-requires-guard.ts
        financial-operation-requires-idempotency.ts
        batch-operation-requires-limit.ts
      schema/
        list-requires-pagination.ts
        vague-boolean.ts
        string-should-be-enum.ts
        missing-required-fields.ts
        unconstrained-file-upload.ts
        sensitive-response-fields.ts
      docs/
        missing-description.ts
        weak-description.ts
        mutating-description-mentions-side-effects.ts
      errors/
        missing-error-schema.ts
    reporters/
      terminal.ts
      json.ts
      markdown.ts
    generators/
      evals.ts
      policy.ts
    utils/
      text.ts
      schema.ts
      path.ts
      sort.ts
  examples/
    simple-openapi.yaml
    risky-openapi.yaml
    clean-openapi.yaml
  tests/
    rules/
    fixtures/
  docs/
    RULES.md
    REPORT_FORMAT.md
    EVAL_FORMAT.md
```

This structure gives separation without monorepo overhead.

## 8. Why Not a Monorepo for v0?

A monorepo is not necessary at the beginning.

A monorepo is useful when the project has separate packages with separate consumers, for example:

```txt
packages/core      imported by CLI, web UI, MCP server
packages/cli       published as executable package
packages/web       React app
packages/mcp       MCP server/proxy
packages/rules     reusable rule pack
```

But Toolsmith v0 has one main deliverable: a CLI. The core can still be organized internally under `src/core`. Later, if the project grows, the internal `src/core` folder can become `packages/core`.

Starting with a monorepo too early has downsides:

- More setup.
- More package config.
- More build complexity.
- More cognitive overhead.
- More places for coding agents to make mistakes.
- Slower first shipping cycle.

Recommended approach:

1. Start single package.
2. Keep `src/core` clean and independent from CLI code.
3. Avoid importing CLI code from core.
4. Later extract `src/core` into `packages/core` if needed.

This gives most of the benefits of a monorepo without the early cost.

## 9. Internal Data Model

The most important design decision is to normalize OpenAPI operations into a simple internal `NormalizedTool` model.

### NormalizedTool

```ts
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type SideEffectType =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "external_communication"
  | "financial"
  | "permission_change"
  | "execution"
  | "unknown";

export type NormalizedParameter = {
  name: string;
  in: "path" | "query" | "header" | "cookie" | "body";
  required: boolean;
  schema?: unknown;
  description?: string;
};

export type NormalizedResponse = {
  statusCode: string;
  description?: string;
  schema?: unknown;
};

export type NormalizedTool = {
  id: string;
  operationId?: string;
  name: string;
  method: HttpMethod;
  path: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: NormalizedParameter[];
  requestBodySchema?: unknown;
  responses: NormalizedResponse[];
  security?: unknown[];
  rawOperation: unknown;
};
```

### Finding

```ts
export type FindingSeverity = "info" | "warning" | "error";

export type FindingCategory = "safety" | "schema" | "docs" | "errors" | "agent_usability" | "auth";

export type Finding = {
  ruleId: string;
  severity: FindingSeverity;
  category: FindingCategory;
  toolId: string;
  toolName: string;
  method: string;
  path: string;
  message: string;
  recommendation: string;
  evidence?: string[];
};
```

### Rule

```ts
export type RuleContext = {
  tool: NormalizedTool;
  allTools: NormalizedTool[];
};

export type Rule = {
  id: string;
  name: string;
  description: string;
  category: FindingCategory;
  defaultSeverity: FindingSeverity;
  check: (ctx: RuleContext) => Finding[];
};
```

### AnalysisResult

```ts
export type AnalysisResult = {
  input: {
    filePath: string;
    title?: string;
    version?: string;
  };
  summary: {
    totalTools: number;
    readOnlyTools: number;
    mutatingTools: number;
    destructiveTools: number;
    highRiskTools: number;
    findingCounts: {
      info: number;
      warning: number;
      error: number;
    };
  };
  scores: {
    overall: number;
    safety: number;
    schema: number;
    docs: number;
    errors: number;
    agentUsability: number;
  };
  tools: ToolRiskSummary[];
  findings: Finding[];
};
```

## 10. OpenAPI Parsing and Normalization

### Parser behavior

The parser should:

1. Accept a local YAML or JSON file.
2. Use Scalar OpenAPI Parser to validate local OpenAPI input.
3. Iterate over `paths`.
4. For each HTTP operation, produce one `NormalizedTool`.
5. Use `operationId` as the preferred tool name.
6. If no `operationId` exists, generate a stable name from method and path.

Example generated name:

```txt
GET /customers/{id}       -> get_customers_by_id
POST /customers           -> post_customers
DELETE /users/{id}        -> delete_users_by_id
```

### Normalization details

Collect:

- method
- path
- operationId
- summary
- description
- tags
- parameters from path-level and operation-level
- request body schema
- responses
- security
- raw operation object

Important: keep normalization simple. Do not try to fully understand every JSON Schema edge case in v0.

## 11. Risk Classification

Risk classification should be deterministic and heuristic-based.

### Base method risk

```txt
GET, HEAD, OPTIONS -> low
POST               -> medium
PUT, PATCH         -> medium
DELETE             -> high
```

### Keyword-based risk boosters

Search in:

- operationId
- generated tool name
- path
- summary
- description
- tags

Normalize to lowercase.

High-risk/destructive keywords:

```txt
delete
remove
destroy
revoke
cancel
terminate
drop
purge
erase
deactivate
disable
ban
suspend
```

Financial keywords:

```txt
payment
charge
refund
transfer
payout
invoice
billing
subscription
credit
debit
bank
```

External communication keywords:

```txt
email
sms
message
notify
notification
invite
webhook
publish
post
send
broadcast
```

Permission/auth keywords:

```txt
permission
role
admin
owner
scope
token
secret
key
password
credential
api_key
apikey
```

Execution/deployment keywords:

```txt
execute
run
shell
command
script
deploy
release
build
job
workflow
pipeline
```

Batch keywords:

```txt
batch
bulk
many
import
export
sync
mass
```

### Risk levels

- Low: likely read-only and bounded.
- Medium: mutating or ambiguous.
- High: destructive, external side effects, permissions, financial, execution, or missing important guardrails.
- Critical: high-risk operation with multiple missing explicit controls in the API contract or Toolsmith policy metadata, especially destructive/financial/execution operations that also lack idempotency, structured errors, limits, or guard annotations. Do not mark a DELETE operation critical solely because OpenAPI does not reveal an out-of-band human approval workflow.

## 12. MVP Rules

Implement these initial rules.

### Rule 1: Destructive operation should declare an explicit guard signal

ID:

```txt
safety/destructive-requires-guard
```

Trigger:

- HTTP method is DELETE, or
- operation text contains destructive keywords.

Check whether the OpenAPI operation exposes an explicit safety signal in one of these places.

Request parameters or body fields:

```txt
confirm
confirmation
confirmationToken
confirmation_token
confirmed
requireConfirmation
```

Custom OpenAPI extensions:

```txt
x-agent-guard
x-toolsmith-guard
x-requires-confirmation
x-confirmation-required
```

Security or policy metadata generated by Toolsmith can also satisfy this later, but plain OpenAPI usually cannot represent a separate human approval workflow unless the API authors model it explicitly.

Finding:

- Severity: error.
- Category: safety.

Message:

```txt
Destructive operation does not declare an explicit agent guard or confirmation signal in the API contract.
```

Recommendation:

```txt
Before exposing this operation to autonomous agents, add an explicit confirmation field, a vendor extension such as x-agent-guard, or a generated guard policy that requires confirmation.
```

Important limitation:

```txt
This rule does not prove the backend lacks a human approval flow. It only says the OpenAPI contract does not expose a machine-readable guard signal that an OpenAPI-to-tool or OpenAPI-to-MCP generator could preserve.
```

#### Representing guard intent in OpenAPI

OpenAPI does not have a standard `requiresConfirmation` field. For agent-readiness analysis, Toolsmith should look for explicit machine-readable signals that API authors can choose to expose.

Option 1: model confirmation as an actual request field.

```yaml
delete:
  operationId: deleteUser
  parameters:
    - name: id
      in: path
      required: true
      schema:
        type: string
  requestBody:
    required: true
    content:
      application/json:
        schema:
          type: object
          required:
            - confirmationToken
          properties:
            confirmationToken:
              type: string
              description: Token issued after an explicit user confirmation step.
```

This is strongest when the backend really validates the token.

Option 2: use a vendor extension for tool-generation metadata.

```yaml
delete:
  operationId: deleteUser
  x-agent-guard:
    mode: require_confirmation
    reason: Deletes a user account.
    controls:
      - confirmation
      - audit_log
```

This is useful for a future OpenAPI-to-MCP generator because the generated MCP tool can carry the guard policy forward even if the HTTP API itself does not have a confirmation parameter.

Option 3: leave the OpenAPI unchanged and let Toolsmith generate an advisory policy.

```yaml
operations:
  deleteUser:
    method: DELETE
    path: /users/{id}
    mode: require_confirmation
```

This is valid as a recommendation, but it requires a runtime guard or generated MCP server to enforce it.

### Rule 2: Mutating operation should support dry-run or preview

ID:

```txt
safety/mutating-requires-dry-run
```

Trigger:

- POST, PUT, PATCH, DELETE.

Check whether request parameters/body include one of:

```txt
dryRun
dry_run
preview
validateOnly
validate_only
planOnly
plan_only
```

Finding:

- Severity: warning.
- Category: safety.

Recommendation:

```txt
Add dry-run, preview, or validate-only support when possible. Otherwise mark the operation as guarded.
```

### Rule 3: Financial operation requires idempotency

ID:

```txt
safety/financial-requires-idempotency
```

Trigger:

- operation text contains financial keywords
- and method is POST, PUT, PATCH, or DELETE.

Check for parameter/header/body field:

```txt
idempotencyKey
idempotency_key
Idempotency-Key
requestId
request_id
clientRequestId
client_request_id
```

Finding:

- Severity: error.
- Category: safety.

Recommendation:

```txt
Financial or billing operations should support idempotency keys to make agent retries safer.
```

### Rule 4: External communication requires guard

ID:

```txt
safety/external-communication-requires-guard
```

Trigger:

- operation text contains email, sms, send, invite, notify, publish, webhook, broadcast.

Finding:

- Severity: warning or error depending on method.
- Category: safety.

Recommendation:

```txt
External communication tools should require confirmation, rate limits, and audit logging before autonomous use.
```

### Rule 5: List/search requires pagination or limit

ID:

```txt
schema/list-requires-pagination
```

Trigger:

- method is GET
- and operation text contains list, search, query, all, records, customers, users, items, events.

Check for query parameters:

```txt
limit
page
pageSize
page_size
perPage
per_page
cursor
offset
next
nextCursor
```

Finding:

- Severity: warning.
- Category: agent_usability.

Recommendation:

```txt
List/search operations should expose pagination or limit parameters to prevent unbounded agent outputs.
```

### Rule 6: Batch operation requires max item limit

ID:

```txt
safety/batch-operation-requires-limit
```

Trigger:

- operation text contains batch, bulk, import, sync, mass.

Check request body schema for array fields with `maxItems`, or parameters like:

```txt
maxItems
max_items
limit
batchSize
batch_size
```

Finding:

- Severity: warning.
- Category: safety.

Recommendation:

```txt
Batch operations should define maximum item limits to prevent runaway agent actions.
```

### Rule 7: Vague boolean parameter

ID:

```txt
schema/vague-boolean
```

Trigger:

Find boolean parameters or body properties with names:

```txt
force
flag
enabled
active
override
skip
ignore
mode
```

Finding:

- Severity: warning.
- Category: schema.

Recommendation:

```txt
Use explicit boolean names such as forceDelete, skipValidation, or sendNotification. Avoid vague flags for agent-callable tools.
```

### Rule 8: Free string that should be enum

ID:

```txt
schema/string-should-be-enum
```

Trigger:

Find string parameters/properties named:

```txt
status
state
role
type
category
priority
visibility
mode
action
sort
order
```

If schema has no enum.

Finding:

- Severity: info or warning.
- Category: schema.

Recommendation:

```txt
Consider using an enum to make valid values explicit for agents.
```

### Rule 9: Missing operation description

ID:

```txt
docs/missing-description
```

Trigger:

- no summary and no description.

Finding:

- Severity: warning.
- Category: docs.

Recommendation:

```txt
Add a clear operation summary and description so agents can choose this tool correctly.
```

### Rule 10: Weak description

ID:

```txt
docs/weak-description
```

Trigger:

- description/summary combined length is less than 30 characters.

Finding:

- Severity: info.
- Category: docs.

Recommendation:

```txt
Add a more specific description including purpose, side effects, constraints, and expected result.
```

### Rule 11: Mutating description should mention side effects

ID:

```txt
docs/mutating-description-mentions-side-effects
```

Trigger:

- method is POST, PUT, PATCH, DELETE.

Check whether description mentions words like:

```txt
creates
updates
deletes
modifies
sends
charges
changes
side effect
```

Finding:

- Severity: info.
- Category: docs.

Recommendation:

```txt
Mutating tool descriptions should explicitly describe what changes when the tool is called.
```

### Rule 12: Missing structured error schema

ID:

```txt
errors/missing-error-schema
```

Trigger:

- operation responses do not include any 4xx or 5xx response with a schema.

Finding:

- Severity: warning.
- Category: errors.

Recommendation:

```txt
Define structured error responses with stable error codes and messages so agents can recover safely.
```

### Rule 13: Sensitive response fields

ID:

```txt
schema/sensitive-response-fields
```

Trigger:

Inspect response schemas for fields containing:

```txt
token
secret
password
apiKey
api_key
credential
privateKey
private_key
accessToken
refreshToken
```

Finding:

- Severity: error.
- Category: safety.

Recommendation:

```txt
Avoid exposing sensitive fields in agent-readable responses, or mark them as redacted/protected.
```

### Rule 14: File upload size unconstrained

ID:

```txt
schema/unconstrained-file-upload
```

Trigger:

- requestBody content type includes multipart/form-data or binary upload
- and no obvious max size metadata exists.

Finding:

- Severity: warning.
- Category: safety.

Recommendation:

```txt
File upload operations should define size limits and accepted file types.
```

### Rule 15: Dangerous auth scope

ID:

```txt
auth/dangerous-auth-scope
```

Trigger:

- security scopes include terms like admin, owner, full_access, write_all, delete.

Finding:

- Severity: warning.
- Category: auth.

Recommendation:

```txt
Prefer least-privilege scopes for agent tools. Avoid exposing admin/full-access scopes unless guarded.
```

## 13. Scoring System

Use a simple deterministic scoring system.

Start overall score at 100.

Subtract:

```txt
error   -> 10 points
warning -> 4 points
info    -> 1 point
```

Clamp to 0–100.

Also calculate category scores:

- safety
- schema
- docs
- errors
- agentUsability
- auth

Each category starts at 100 and subtracts only findings in that category.

Risk summary:

```ts
if score >= 90 -> excellent
if score >= 75 -> good
if score >= 60 -> needs_work
else -> risky
```

This scoring does not need to be scientifically perfect. It should be explainable and stable.

## 14. Report Format

### JSON report

Example:

```json
{
  "input": {
    "filePath": "examples/risky-openapi.yaml",
    "title": "Example API",
    "version": "1.0.0"
  },
  "summary": {
    "totalTools": 12,
    "readOnlyTools": 5,
    "mutatingTools": 6,
    "destructiveTools": 1,
    "highRiskTools": 3,
    "findingCounts": {
      "info": 4,
      "warning": 9,
      "error": 2
    }
  },
  "scores": {
    "overall": 54,
    "safety": 44,
    "schema": 72,
    "docs": 81,
    "errors": 60,
    "agentUsability": 70
  },
  "findings": [
    {
      "ruleId": "safety/destructive-requires-guard",
      "severity": "error",
      "category": "safety",
      "toolId": "deleteUser",
      "toolName": "deleteUser",
      "method": "DELETE",
      "path": "/users/{id}",
      "message": "Destructive operation does not declare an explicit agent guard or confirmation signal in the API contract.",
      "recommendation": "Before exposing this operation to autonomous agents, add an explicit confirmation field, a vendor extension such as x-agent-guard, or a generated guard policy that requires confirmation.",
      "evidence": ["HTTP method DELETE"]
    }
  ]
}
```

### Markdown report

Sections:

```md
# Toolsmith Agent-Readiness Report

## Summary

## Scores

## High-Risk Operations

## Findings by Severity

## Findings by Operation

## Recommended Guard Policy Summary

## Generated Eval Ideas
```

Keep it readable and useful in GitHub PRs.

## 15. Eval Generation

Toolsmith should generate deterministic eval cases from rules and schemas.

The eval generator does not execute tests. It outputs a YAML file that describes recommended test cases.

Command:

```bash
toolsmith evals ./openapi.yaml --out toolsmith.evals.yaml
```

Example output:

```yaml
version: 1
source: examples/risky-openapi.yaml
cases:
  - id: deleteUser_requires_guard
    name: Destructive operation requires an agent guard
    operationId: deleteUser
    method: DELETE
    path: /users/{id}
    type: guard
    input:
      id: "test_id"
    expect:
      blocked: true
      errorCode: CONFIRMATION_REQUIRED
    reason: DELETE operation should not be executable by an autonomous agent unless a runtime guard or confirmation policy is present.

  - id: listCustomers_enforces_limit
    name: List operation enforces result limit
    operationId: listCustomers
    method: GET
    path: /customers
    type: boundary
    input:
      limit: 100000
    expect:
      blocked: true
      errorCode: LIMIT_TOO_HIGH
    reason: List/search tools should prevent unbounded output.

  - id: createInvoice_rejects_missing_required_field
    name: Create invoice rejects missing required field
    operationId: createInvoice
    method: POST
    path: /invoices
    type: schema
    input: {}
    expect:
      valid: false
      errorCode: VALIDATION_ERROR
    reason: Required request fields should be validated before tool execution.
```

### Eval generation rules

Generate eval cases for:

1. Destructive operations:

   - missing confirmation should be blocked.

2. Mutating operations:

   - dry-run/preview should be tested if present.

3. List/search operations:

   - too-large limit should be rejected.

4. Required fields:

   - missing required fields should fail validation.

5. Enum fields:

   - invalid enum value should fail validation.

6. Batch operations:

   - too many items should be blocked.

7. Sensitive response fields:

   - response should be redacted or flagged.

8. Financial operations:

   - missing idempotency key should fail or warn.

The generated evals are recommendations. Make that clear in the file header.

## 16. Guard Policy Generation

Command:

```bash
toolsmith policy ./openapi.yaml --out guard-policy.yaml
```

Example:

```yaml
version: 1
generatedBy: toolsmith
defaultMode: allow
operations:
  deleteUser:
    method: DELETE
    path: /users/{id}
    risk: high
    mode: require_confirmation
    reasons:
      - Destructive operation
      - Missing confirmation parameter
    recommendedControls:
      - confirmation
      - audit_log

  chargePayment:
    method: POST
    path: /payments/charge
    risk: high
    mode: require_confirmation
    reasons:
      - Financial operation
      - Missing idempotency key
    recommendedControls:
      - confirmation
      - idempotency_key
      - audit_log

  listCustomers:
    method: GET
    path: /customers
    risk: low
    mode: allow
    limits:
      maxRows: 100
```

Policy modes:

```txt
allow
allow_with_limits
require_confirmation
deny_by_default
```

Default mapping:

- Low risk -> allow.
- Medium risk -> allow_with_limits.
- High risk -> require_confirmation.
- Critical risk -> deny_by_default.

## 17. CLI UX

### `toolsmith lint`

Usage:

```bash
toolsmith lint <file> [--format pretty|json] [--fail-on warning|error]
```

Default: pretty terminal output.

Exit codes:

```txt
0 -> no errors
1 -> findings at or above fail-on threshold
2 -> invalid input or parse error
```

Default fail threshold should be `error`.

### `toolsmith report`

Usage:

```bash
toolsmith report <file> --format json|markdown --out <path>
```

If `--out` omitted, print to stdout.

### `toolsmith evals`

Usage:

```bash
toolsmith evals <file> --out <path>
```

### `toolsmith policy`

Usage:

```bash
toolsmith policy <file> --out <path>
```

### `toolsmith rules`

Usage:

```bash
toolsmith rules
```

Print all rule IDs, categories, severities, and descriptions.

## 18. Error Handling

All CLI errors should be clean and actionable.

Example:

```txt
Toolsmith could not parse the OpenAPI file.

File: ./openapi.yaml
Reason: Missing required "openapi" field.

Try validating that the file is a valid OpenAPI 3.x document.
```

In JSON mode:

```json
{
  "ok": false,
  "error": {
    "code": "OPENAPI_PARSE_ERROR",
    "message": "Missing required openapi field.",
    "file": "./openapi.yaml"
  }
}
```

Stable internal error codes:

```txt
FILE_NOT_FOUND
UNSUPPORTED_FILE_TYPE
OPENAPI_PARSE_ERROR
OPENAPI_UNSUPPORTED_VERSION
REPORT_WRITE_ERROR
UNKNOWN_COMMAND_ERROR
```

## 19. Implementation Plan

### Phase 1: Project setup

Tasks:

- Initialize Bun + TypeScript project.
- Add CLI entrypoint.
- Add example OpenAPI files.
- Add basic README.
- Add package scripts.

Package scripts:

```json
{
  "scripts": {
    "dev": "bun run src/cli/index.ts",
    "test": "bun test",
    "typecheck": "tsc --noEmit",
    "lint:example": "bun run src/cli/index.ts lint examples/risky-openapi.yaml"
  }
}
```

Bin config:

```json
{
  "bin": {
    "toolsmith": "./src/cli/index.ts"
  }
}
```

The CLI file should start with:

```ts
#!/usr/bin/env bun
```

### Phase 2: OpenAPI parser

Tasks:

- Implement `parseOpenApi(filePath)`.
- Support YAML/JSON.
- Return parsed/dereferenced document.
- Extract basic metadata: title, version.
- Add tests with valid and invalid fixtures.

### Phase 3: Normalizer

Tasks:

- Implement `normalizeOpenApi(document)`.
- Convert operations into `NormalizedTool[]`.
- Generate stable IDs/names when `operationId` is missing.
- Extract parameters, request bodies, responses, security.

### Phase 4: Rule engine

Tasks:

- Implement `Rule` interface.
- Implement `runRules(tools, rules)`.
- Implement 5 initial rules first:

  1. destructive requires confirmation
  2. mutating requires dry-run
  3. list requires pagination
  4. missing description
  5. missing error schema

Then add the remaining MVP rules.

### Phase 5: Scoring

Tasks:

- Implement overall score.
- Implement category scores.
- Implement risk classification per tool.
- Count read-only/mutating/destructive tools.

### Phase 6: Terminal reporter

Tasks:

- Pretty CLI output.
- Group findings by severity.
- Include score and summary.
- Make output readable but not overdesigned.

### Phase 7: JSON and Markdown reports

Tasks:

- Implement JSON report renderer.
- Implement Markdown report renderer.
- Add `report` command.

### Phase 8: Eval generator

Tasks:

- Generate YAML recommended evals.
- Cover destructive, mutating, list, required field, enum, batch, financial cases.
- Add `evals` command.

### Phase 9: Policy generator

Tasks:

- Generate YAML guard policy.
- Add `policy` command.

### Phase 10: Polish

Tasks:

- Good README.
- Add screenshots or terminal output examples.
- Add sample reports.
- Add tests for rules.
- Add CI with GitHub Actions.
- Add npm publish instructions, even if not publishing immediately.

## 20. Testing Strategy

Use Bun test.

Test categories:

### Parser tests

- Valid YAML OpenAPI.
- Valid JSON OpenAPI.
- Missing file.
- Invalid YAML.
- Unsupported OpenAPI version.

### Normalizer tests

- Extracts GET operation.
- Extracts POST operation with request body.
- Extracts path/query parameters.
- Generates fallback operation name.
- Handles missing description.

### Rule tests

Each rule should have focused fixtures.

Example:

```ts
test("DELETE operation without an explicit guard signal creates finding", () => {
  const tool = makeTool({
    method: "DELETE",
    path: "/users/{id}",
    name: "deleteUser",
    parameters: [{ name: "id", in: "path", required: true }],
  });

  const findings = destructiveRequiresConfirmation.check({
    tool,
    allTools: [tool],
  });

  expect(findings).toHaveLength(1);
  expect(findings[0].severity).toBe("error");
});
```

### Snapshot tests

Optional:

- Markdown report output.
- YAML eval output.
- YAML policy output.

## 21. Example OpenAPI Fixture

Create `examples/risky-openapi.yaml`:

```yaml
openapi: 3.0.0
info:
  title: Risky Example API
  version: 1.0.0
paths:
  /users:
    get:
      operationId: listUsers
      summary: List users
      responses:
        "200":
          description: OK
    post:
      operationId: createUser
      summary: Create user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
              properties:
                email:
                  type: string
                role:
                  type: string
                force:
                  type: boolean
      responses:
        "200":
          description: OK
  /users/{id}:
    delete:
      operationId: deleteUser
      summary: Delete user
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "204":
          description: Deleted
  /payments/charge:
    post:
      operationId: chargePayment
      summary: Charge payment
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - customerId
                - amount
              properties:
                customerId:
                  type: string
                amount:
                  type: number
      responses:
        "200":
          description: OK
  /emails/send:
    post:
      operationId: sendEmail
      summary: Send email
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - to
                - subject
                - body
              properties:
                to:
                  type: string
                subject:
                  type: string
                body:
                  type: string
      responses:
        "200":
          description: OK
```

This fixture should trigger many findings and make the demo obvious.

## 22. README Requirements

The README should explain:

1. What Toolsmith is.
2. Why agent-readiness matters.
3. Why it does not require an LLM.
4. Installation.
5. CLI examples.
6. Example output.
7. Rule list.
8. Generated evals.
9. Generated policy.
10. Roadmap.

Suggested README headline:

```md
# Toolsmith

Agent-readiness linting for OpenAPI tools.

Toolsmith analyzes OpenAPI specs and detects API design issues that make tools risky, ambiguous, or hard for AI agents to use safely.
```

Suggested README pitch:

```md
Most APIs were designed for humans and backend services, not autonomous agents. Toolsmith helps identify the missing safety and usability contracts before those APIs become agent-callable tools.
```

## 23. Future Roadmap

After MVP, possible features:

### v0.2

- MCP tool definition input.
- SARIF output for CI/code scanning.
- Config file `.toolsmithrc`.
- Rule enable/disable.
- Severity overrides.
- Better JSON Schema traversal.

### v0.3

- OpenAPI-to-MCP safe generator.
- Generate TypeScript MCP server skeleton.
- Generate Zod schemas.
- Generate tool descriptions.
- Generate guard wrappers.

### v0.4

- MCP Guard runtime proxy.
- Enforce generated policies at runtime.
- Audit logs.
- Confirmation workflows.

### v0.5

- Optional LLM mode.
- Improve descriptions.
- Suggest workflow grouping.
- Suggest better operation names.
- Summarize reports in natural language.

The core must remain useful without an LLM.

## 24. Design Principles

1. Deterministic first.
2. Works offline.
3. Clear over clever.
4. Stable output formats.
5. Agent-safety over generic API linting.
6. Useful even if imperfect.
7. Rules should be explainable.
8. Reports should be human-readable and machine-readable.
9. Avoid overengineering v0.
10. Keep core independent from CLI.

## 25. Definition of Done for MVP

MVP is done when:

- User can install/run with Bun.
- User can run `toolsmith lint examples/risky-openapi.yaml`.
- Toolsmith parses OpenAPI YAML and JSON.
- Toolsmith normalizes operations.
- At least 10 rules are implemented.
- Findings include severity, category, message, recommendation, operation, and evidence.
- Terminal output is readable.
- JSON report works.
- Markdown report works.
- YAML eval generation works.
- YAML policy generation works.
- README explains the project clearly.
- Tests exist for parser, normalizer, and major rules.

## 26. Instructions for Coding Agent

When implementing this project:

1. Start with the single-package repo structure.
2. Do not create a monorepo yet.
3. Use Bun and TypeScript.
4. Implement the smallest working CLI first.
5. Keep `src/core` independent from `src/cli`.
6. Avoid adding a web UI.
7. Avoid adding LLM calls.
8. Avoid implementing full MCP generation in v0.
9. Prefer deterministic heuristics and clear rule outputs.
10. Add tests for every rule.
11. Use simple, readable code over excessive abstraction.
12. Make the demo fixture intentionally risky so output is impressive.
13. Ensure commands fail with clear error messages.
14. Ensure JSON/Markdown/YAML outputs are stable.

## 27. Initial Build Order for Agent

Implement in this exact order:

1. Create Bun TypeScript project.
2. Add CLI with `version` and `rules` placeholder.
3. Add OpenAPI parser.
4. Add normalizer.
5. Add rule interface.
6. Add first five rules.
7. Add `lint` command.
8. Add scoring.
9. Add terminal reporter.
10. Add JSON report.
11. Add Markdown report.
12. Add eval generator.
13. Add policy generator.
14. Add tests.
15. Polish README.

Do not start with evals or policy before the linter works.

## 28. Example Final Demo

The final demo should look like this:

```bash
bun run src/cli/index.ts lint examples/risky-openapi.yaml
```

Output:

```txt
Toolsmith Agent-Readiness Report

Risky Example API v1.0.0
Operations analyzed: 5
Overall score: 48/100

Summary:
  Read-only operations: 1
  Mutating operations: 4
  Destructive operations: 1
  High-risk operations: 3

Errors:
  safety/destructive-requires-guard
  DELETE /users/{id}
  Destructive operation does not declare an explicit agent guard or confirmation signal in the API contract.

  safety/financial-requires-idempotency
  POST /payments/charge
  Financial or billing operation does not expose an idempotency key.

Warnings:
  schema/list-requires-pagination
  GET /users
  List/search operation has no pagination or limit parameter.

  safety/mutating-requires-dry-run
  POST /emails/send
  Mutating operation does not expose dry-run or preview mode.
```

Then:

```bash
bun run src/cli/index.ts report examples/risky-openapi.yaml --format markdown --out report.md
bun run src/cli/index.ts evals examples/risky-openapi.yaml --out evals.yaml
bun run src/cli/index.ts policy examples/risky-openapi.yaml --out guard-policy.yaml
```

This is enough to make the project feel real and portfolio-worthy.
