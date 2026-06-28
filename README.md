# ToolSafe

ToolSafe is a deterministic static analyzer that scores how safe an OpenAPI-described API is to expose to an autonomous AI agent — before you wire it into an agent framework, an MCP server, or a tool-calling pipeline.

It is **not** a general-purpose OpenAPI linter. Spectral, vacuum, and the Speakeasy linter already do an excellent job of validating spec correctness and design hygiene (naming, descriptions, response shapes). ToolSafe answers a narrower, more specific question: **if I let an LLM agent call this operation autonomously, what could go wrong, and does the spec give the agent (or the agent's tool layer) any way to avoid it?**

## Why this is a different problem than "API linting"

A human developer calling `DELETE /users/{id}` has judgment, context from documentation, and accountability. An agent calling the exact same operation has none of that — it acts on whatever the OpenAPI contract tells it, and nothing more. ToolSafe's `safety` rule category exists for exactly this gap: operations that are perfectly fine for a human-in-the-loop integration but underspecified for an autonomous caller — no confirmation signal before a destructive action, no idempotency key on a financial mutation, no dry-run mode, no bound on a batch operation.

Some of ToolSafe's other rule categories (`schema`, `errors`, `docs`) overlap with general API design hygiene on purpose — a well-documented, well-typed API is safer for agents _and_ humans. We don't claim those rules are agent-novel. The `safety` category is the part of ToolSafe that only exists because the caller is autonomous; see [Rules](#rules) below for which is which.

## How it's different from MCP/agent security scanners

There's a growing set of tools (MCP-Scan, MCP-Shield, Cisco's mcp-scanner, Proximity) that scan _already-running_ MCP servers or tool descriptions for signs of compromise: prompt injection hidden in a tool's text, "tool poisoning," shadowing attacks where one tool's description tries to hijack another. That's a real and different threat model — a malicious or compromised tool actively trying to manipulate the agent.

ToolSafe assumes the API is honest. The risk it looks for is structural, not adversarial: a well-intentioned API that simply doesn't tell an autonomous caller enough to act safely. It also runs one layer earlier in the pipeline — against the OpenAPI source of truth, before any MCP server or tool wrapper is generated from it — so problems get caught at design time rather than after deployment.

**Key properties:**

- **Deterministic** — same input always produces the same output
- **Offline-first** — parses the spec file locally, never calls the API
- **No LLM** — all rules are static and explainable
- **CI-ready** — exit codes, JSON output, SARIF for GitHub code scanning

## Install

### Via npm (recommended)

```bash
npm install -g toolsafe
```

Requires [Bun](https://bun.sh) (v1.2+) as the runtime.

### Via bun

```bash
bun install -g toolsafe
```

### From source

```bash
git clone https://github.com/styltsou/toolsafe.git
cd toolsafe
bun install
bun run build
```

### Shell completions (bash / zsh)

```bash
# bash
eval "$(toolsafe completion bash)"

# zsh — add to ~/.zshrc
echo 'eval "$(toolsafe completion zsh)"' >> ~/.zshrc
```

## Quick Start

```bash
# Bootstrap ToolSafe in a new repo
toolsafe init

# Bootstrap + discover and lint all OpenAPI specs in the project
toolsafe init --analyze

# Lint an OpenAPI file
toolsafe lint path/to/openapi.yaml

# Lint from a remote URL
toolsafe lint https://example.com/openapi.json

# Generate a SARIF report (for GitHub code scanning)
toolsafe report path/to/openapi.yaml --format sarif

# Generate a guard policy draft
toolsafe generate --kind policy path/to/openapi.yaml
```

## CLI Reference

### `toolsafe init`

Bootstrap ToolSafe configuration for a new repo. Creates `toolsafe.config.json` and `.github/workflows/toolsafe.yml` in the current directory.

| Option          | Description                                        |
| --------------- | -------------------------------------------------- |
| `-a, --analyze` | Discover and lint all OpenAPI specs in the project |

If either output file already exists, you are prompted before overwriting (interactive TTY) or the file is silently skipped (non-TTY, e.g. CI).

```bash
toolsafe init
toolsafe init --analyze
```

When `--analyze` is used, ToolSafe discovers OpenAPI specs by:

1. **Naming conventions** — files named `openapi.*`, `swagger.*`, `spec.*`, or inside `openapi/` / `swagger/` directories
2. **Content sniffing** — other `.yaml`/`.yml`/`.json` files are checked for an `openapi` root key before analysis

```bash
$ toolsafe init --analyze
Created toolsafe.config.json
Created .github/workflows/toolsafe.yml

Analyzing project for OpenAPI specs...
  ✓ risky-openapi.yaml       (45 operations, 3 errors, 5 warnings)
  ✓ openapi.json             (5 operations, 0 errors, 1 warning)

Summary: 2 specs analyzed, 0 skipped
Total: 3 errors, 5 warnings across 50 operations
```

### `toolsafe lint <file>`

Analyze an OpenAPI file and print findings to the terminal.

| Option                       | Description                       | Default                            |
| ---------------------------- | --------------------------------- | ---------------------------------- |
| `--format <pretty\|json>`    | Output format                     | `pretty`                           |
| `--fail-on <warning\|error>` | Exit with code 1 at this severity | `error`                            |
| `--config <path>`            | Path to config file               | Auto-detect `toolsafe.config.json` |

```bash
toolsafe lint api.yaml
toolsafe lint api.yaml --format json
toolsafe lint api.yaml --fail-on warning
toolsafe lint api.yaml --config toolsafe.config.json
```

Lint supports local files and remote URLs (`https://...`).

**Exit codes:** `0` if no findings at threshold, `1` if findings meet threshold, `2` on error.

### `toolsafe report <file>`

Generate a detailed report in JSON, Markdown, or SARIF. Supports local files and remote URLs.

| Option                             | Description                     | Default                            |
| ---------------------------------- | ------------------------------- | ---------------------------------- |
| `--format <json\|markdown\|sarif>` | Output format                   | `markdown`                         |
| `--out <path>`                     | Write to file instead of stdout | —                                  |
| `--config <path>`                  | Path to config file             | Auto-detect `toolsafe.config.json` |

```bash
toolsafe report api.yaml --format markdown --out report.md
toolsafe report api.yaml --format json > report.json
toolsafe report api.yaml --format sarif --out results.sarif
toolsafe report api.yaml --config toolsafe.config.json --format json
```

### `toolsafe generate <file>`

Generate an advisory guard policy draft or eval case ideas in YAML.

| Option                   | Description                     | Default                            |
| ------------------------ | ------------------------------- | ---------------------------------- |
| `--kind <policy\|evals>` | Output kind                     | `policy`                           |
| `--out <path>`           | Write to file instead of stdout | —                                  |
| `--config <path>`        | Path to config file             | Auto-detect `toolsafe.config.json` |

```bash
toolsafe generate --kind policy api.yaml
toolsafe generate --kind policy api.yaml --out guard-policy.yaml
toolsafe generate --kind evals api.yaml
toolsafe generate --kind evals api.yaml --out toolsafe.evals.yaml
toolsafe generate --kind policy api.yaml --config toolsafe.config.json
```

### `toolsafe rules`

List all available rules with their ID, severity, category, and description.

```bash
toolsafe rules
```

## Configuration

ToolSafe auto-detects `toolsafe.config.json` in the current directory. You can also pass an explicit path with `--config`.

Run `toolsafe init` to create a config file with sensible defaults (all rules enabled at their default severity, `lint.failOn: "error"`, `report.format: "markdown"`).

```json
{
  "rules": {
    "safety/destructive-requires-guard": "off",
    "errors/missing-error-schema": "error"
  },
  "lint": {
    "failOn": "warning"
  },
  "report": {
    "format": "sarif",
    "out": "results.sarif"
  }
}
```

### Rules

Each rule ID maps to one of:

| Value                              | Behavior                     |
| ---------------------------------- | ---------------------------- |
| `"off"`                            | Rule is disabled             |
| `"info"` / `"warning"` / `"error"` | Override the rule's severity |

### Lint

| Field    | Description                          | Default   |
| -------- | ------------------------------------ | --------- |
| `failOn` | Minimum severity to exit with code 1 | `"error"` |

**Precedence:** CLI `--fail-on` > config `lint.failOn` > default (`"error"`).

### Report

| Field    | Description                  | Default      |
| -------- | ---------------------------- | ------------ |
| `format` | Default report output format | `"markdown"` |
| `out`    | Default output file path     | stdout       |

**Precedence:** CLI `--format`/`--out` > config `report.*` > built-in defaults.

## Output Formats

### Pretty (terminal)

Coloured human-readable output with scores, high-risk operations, and findings grouped by severity.

### JSON

Full structured output including scores, per-tool risk, and all findings with evidence and recommendations.

### Markdown

PR-and-documentation-friendly report with summary table, scores, operation risk table, and findings.

### SARIF (2.1.0)

Static Analysis Results Interchange Format — compatible with GitHub code scanning, GitLab SAST, and other SARIF consumers.

**Level mapping:** `error` → `error`, `warning` → `warning`, `info` → `note`

```bash
toolsafe report api.yaml --format sarif --out results.sarif
```

Upload to GitHub:

```yaml
# .github/workflows/toolsafe.yml
name: ToolSafe
on: [push, pull_request]
jobs:
  toolsafe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install -g toolsafe && toolsafe report openapi.yaml --format sarif --out results.sarif
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```

## Rules

Rules are grouped into categories. The **Agent-specific?** column tells you whether a rule exists _because the caller is autonomous_ (you wouldn't necessarily need it for human-facing API review) or whether it's general API design hygiene that ToolSafe enforces because it also benefits agent callers.

| Rule ID                                           | Severity | Category        | Agent-specific? | What it flags                                                                                                             |
| ------------------------------------------------- | -------- | --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `safety/destructive-requires-guard`               | error    | safety          | **Yes**         | DELETE/destructive operations with no confirmation field or guard extension                                               |
| `safety/external-communication-requires-guard`    | warning  | safety          | **Yes**         | Mutating email/SMS/notification/webhook operations with no guard signal                                                   |
| `safety/financial-requires-idempotency`           | warning  | safety          | **Yes**         | Financial mutations (charge, refund, payout) with no idempotency key                                                      |
| `safety/mutating-requires-dry-run`                | warning  | safety          | **Yes**         | Mutating operations with no dry-run/preview/validate-only mode                                                            |
| `safety/batch-operation-requires-limit`           | warning  | safety          | **Yes**         | Bulk/batch operations on arrays with no max-items or limit field                                                          |
| `schema/vague-boolean`                            | warning  | schema          | **Yes**         | Boolean fields like `force` or `flag` with no self-evident meaning                                                        |
| `schema/string-should-be-enum`                    | warning  | schema          | **Yes**         | Constrained-looking strings (status, role, mode) with no enum                                                             |
| `docs/mutating-description-mentions-side-effects` | warning  | docs            | **Yes**         | Mutating operation descriptions that don't say what they change                                                           |
| `docs/weak-description`                           | info     | docs            | Partial         | Placeholder or too-short descriptions (agents rely on these for tool selection; humans have more context to fall back on) |
| `auth/dangerous-auth-scope`                       | warning  | auth            | Partial         | Overly broad auth scopes (`admin`, `*`) — least-privilege matters more for an unsupervised caller                         |
| `schema/unconstrained-file-upload`                | warning  | schema          | No              | File inputs with no size constraint                                                                                       |
| `schema/sensitive-response-fields`                | warning  | schema          | No              | Response schemas exposing tokens, secrets, or credentials                                                                 |
| `schema/list-requires-pagination`                 | warning  | agent_usability | No              | List/search GETs with no pagination or limit parameter                                                                    |
| `docs/missing-description`                        | warning  | docs            | No              | Operations with no summary or description at all                                                                          |
| `errors/missing-error-schema`                     | warning  | errors          | No              | Operations with no structured 4xx/5xx response schema                                                                     |

Run `toolsafe rules` to see the full list with current severities.

## Inline Suppression

Operations can suppress specific rules or all rules using vendor extensions. This lets you adopt ToolSafe incrementally — mark known findings as accepted so CI passes while the remaining findings get addressed.

**Suppress specific rules on an operation:**

```yaml
/users/{id}:
  delete:
    operationId: deleteUser
    x-toolsafe-ignore:
      - safety/destructive-requires-guard
```

**Suppress all rules on an operation:**

```yaml
/users/{id}:
  delete:
    operationId: deleteUser
    x-toolsafe-ignore-all: true
```

Both extensions apply at the operation level only. Suppressed findings never appear in output, regardless of their severity.

## How rules match operations

Rules use a tokenized intent-matching helper (`getOperationIntentText` / `hasOperationIntentKeyword`) that scopes keyword matching to operation IDs, names, methods, paths, summaries, and tags — deliberately excluding free-text `description` prose, which is where naive substring matching tends to produce false positives (e.g. a read-only operation whose description happens to mention "cancel" in passing). See `docs/RULES.md` for the matching approach per rule and known precision tradeoffs.

This is a heuristic, explainable approach, not a full semantic parse of API intent — ToolSafe will not catch every agent-safety issue, and it will occasionally be wrong on edge cases. Treat findings as a static-analysis signal to review, not a certification.

## Roadmap

ToolSafe is early (v0.x) and the rule engine is intentionally simple right now. Rough priority order, subject to change:

- **Selector-based rule matching.** Rules currently match against a tokenized text blob per operation. The plan is to move toward JSONPath-style scoped selectors per rule (closer to how Spectral/vacuum target OpenAPI documents) so a rule only ever sees the exact field it's meant to check, rather than matching across operation IDs, paths, and summaries indiscriminately. This should remove a category of false positive at the source instead of patching it rule-by-rule.
- **Inline suppression.** ✅ Implemented. A way to mark a specific operation as reviewed and intentionally accepted (e.g. an `x-toolsafe-ignore: rule-id` vendor extension), so teams can adopt ToolSafe incrementally instead of fixing every finding before CI goes green.
- **Precision validation against real-world specs.** Running and publishing results against large public OpenAPI specs (Stripe, GitHub, etc.), not just synthetic fixtures, with measured false-positive rates per rule.
- **More complete `$ref` resolution.** Rules should see the fully dereferenced schema graph rather than relying on each rule to handle references defensively.
- **Guard policy / eval generation maturity.** `toolsafe generate` currently produces advisory drafts; the goal is for generated guard policies and eval cases to be closer to drop-in usable rather than a starting point that needs heavy editing.
- **Not planned for the deterministic core, but open to exploring as opt-in:** an LLM-assisted analysis layer for the harder-to-heuristic cases (similar to how some MCP security scanners offer LLM analysis as an optional add-on alongside their deterministic checks). Would ship as a separate, clearly-labeled mode — the default CI path stays deterministic and offline.
- **Out of scope for now:** runtime API execution/proxying, and MCP server generation from a linted spec. ToolSafe analyzes the contract; it doesn't run it or generate a server from it.

Contributions, issue reports, and false-positive reports against real specs are welcome.

## Exit Codes

| Code | Meaning                                              |
| ---- | ---------------------------------------------------- |
| `0`  | Success (lint: no finding met the fail-on threshold) |
| `1`  | Lint succeeded but findings met the threshold        |
| `2`  | Input, parse, option, or unexpected error            |

## Development

```bash
bun run typecheck
bun run lint
bun run format:check
bun test
```

Or run all non-test checks together:

```bash
bun run check
```

Regenerate sample outputs:

```bash
bun run examples:generate
```

## Documentation

See [`docs/README.md`](./docs/README.md) for architecture notes, rule authoring, and report format details.
