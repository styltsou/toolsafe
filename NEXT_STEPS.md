# Next Steps

ToolSafe is now in a good MVP state: local OpenAPI parsing, normalization, deterministic rules, scoring, reports, advisory policy drafts, advisory eval ideas, docs, examples, and CI are in place (64 tests, typecheck clean, 10 rules).

The next work should focus on making ToolSafe easier to adopt in real repositories and easier to integrate into CI/security workflows.

## High Priority

### Finish remaining rules from PRD

| Rule                                              | Status          |
| ------------------------------------------------- | --------------- |
| `docs/weak-description`                           | Not implemented |
| `docs/mutating-description-mentions-side-effects` | Not implemented |
| `safety/batch-operation-requires-limit`           | Not implemented |
| `auth/dangerous-auth-scope`                       | Not implemented |
| `schema/unconstrained-file-upload`                | Not implemented |

### Add missing CLI commands

- `toolsafe rules` — print all rule IDs, categories, severities, and descriptions
- `toolsafe version` — print version

### Config support

Config support should let teams tune ToolSafe without changing source code or forking the rule set.

Goals:

- Let users enable or disable rules, override severities, configure lint failure thresholds, and set output defaults
- Keep default behavior unchanged when no config file exists

Start with `toolsafe.config.json` (JSON only for v1):

```json
{
  "rules": {
    "schema/vague-boolean": "off",
    "errors/missing-error-schema": "error"
  },
  "lint": {
    "failOn": "warning"
  }
}
```

Implementation notes:

- Add `src/config/`, parse once, validate with Zod
- Apply rule filtering and severity overrides before scoring/reporting/policy/eval generation
- Keep config loading deterministic and local-file only
- --config flag can come later

### SARIF output

SARIF would let ToolSafe findings appear in GitHub code scanning and other static-analysis workflows.

Add `--format sarif` to `toolsafe report` (or a dedicated `toolsafe sarif` command).

Mapping sketch:

- `tool.driver.name`: `ToolSafe`
- SARIF result level: `error` → `error`, `warning` → `warning`, `info` → `note`
- SARIF message: finding message plus recommendation
- SARIF location: source OpenAPI file

## Medium Priority

- Polish terminal output with picocolors (better use of colors, grouping, formatting)
- Improve README with CLI examples, screenshots, rule list
- Add `examples/guard-policy.yaml` and `examples/toolsafe-report.md` to showcase output
- Keep examples current: add an `examples:check` script that regenerates outputs into a temp dir and compares against committed examples
- JSON schema traversal improvements for deeper rule analysis

## Future (post-MVP)

- MCP tool definition input support
- OpenAPI-to-MCP safe generator
- Optional LLM mode for description improvements
