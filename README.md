# ToolSafe

ToolSafe is a deterministic agent-readiness linter for OpenAPI APIs.

It parses local or remote OpenAPI 3.x YAML or JSON files, normalizes operations into tool-like records, runs static rules, scores the API, and generates reports, advisory guard policies, and advisory eval ideas.

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

| Option                   | Description                                        |
| ------------------------ | -------------------------------------------------- |
| `-a, --analyze`          | Discover and lint all OpenAPI specs in the project |

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

Rules are grouped into categories:

| Category          | Focus                                                 | Example rule                        |
| ----------------- | ----------------------------------------------------- | ----------------------------------- |
| `safety`          | Destructive, financial, external-communication guards | `safety/destructive-requires-guard` |
| `schema`          | Boolean clarity, enums, sensitive fields              | `schema/vague-boolean`              |
| `docs`            | Missing or weak descriptions                          | `docs/missing-description`          |
| `errors`          | Structured error response schemas                     | `errors/missing-error-schema`       |
| `agent_usability` | Pagination, limits                                    | `schema/list-requires-pagination`   |

Run `toolsafe rules` to see the full list.

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
