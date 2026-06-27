# Toolsmith

Toolsmith is a deterministic, offline-first agent-readiness linter for OpenAPI APIs.

It parses local OpenAPI 3.x YAML or JSON files, normalizes operations into tool-like records, runs static rules, scores the API, and generates reports, advisory guard policies, and advisory eval ideas. It does not call the target API and does not use an LLM.

## Install

```bash
bun install
```

## CLI

Show commands:

```bash
bun run src/cli/index.ts --help
```

Lint an OpenAPI file:

```bash
bun run src/cli/index.ts lint examples/risky-openapi.yaml
```

Generate reports:

```bash
bun run src/cli/index.ts report examples/risky-openapi.yaml --format markdown
bun run src/cli/index.ts report examples/risky-openapi.yaml --format json
```

Generate advisory artifacts:

```bash
bun run src/cli/index.ts policy examples/risky-openapi.yaml
bun run src/cli/index.ts evals examples/risky-openapi.yaml
```

Write generated output to disk:

```bash
bun run src/cli/index.ts report examples/risky-openapi.yaml --format markdown --out TOOLSMITH_REPORT.md
bun run src/cli/index.ts policy examples/risky-openapi.yaml --out guard-policy.yaml
bun run src/cli/index.ts evals examples/risky-openapi.yaml --out toolsmith.evals.yaml
```

## Current Commands

- `lint <file>`: prints terminal or JSON findings and exits based on `--fail-on`.
- `report <file>`: prints or writes JSON/Markdown reports.
- `policy <file>`: prints or writes an advisory guard-policy YAML draft.
- `evals <file>`: prints or writes advisory eval-case YAML ideas.
- `rules`: lists the default rules.

## Exit Codes

- `0`: command succeeded and, for lint, no finding met the configured failure threshold.
- `1`: lint succeeded but findings met the configured threshold.
- `2`: input, parse, option, or unexpected command error.

## Sample Outputs

See `examples/output/` for generated outputs from `examples/risky-openapi.yaml`:

- `lint.txt`
- `toolsmith-report.json`
- `TOOLSMITH_REPORT.md`
- `guard-policy.yaml`
- `toolsmith.evals.yaml`

## Development

```bash
bun run typecheck
bun run lint
bun run format:check
bun test
```

Or run the non-test checks together:

```bash
bun run check
```

Regenerate sample outputs:

```bash
bun run examples:generate
```

## Documentation

Start with [`docs/README.md`](./docs/README.md) for architecture notes, onboarding, rule details, report formats, and generated artifacts.
