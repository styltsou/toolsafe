# Next Steps

Toolsmith is now in a good MVP state: local OpenAPI parsing, normalization, deterministic rules, scoring, reports, advisory policy drafts, advisory eval ideas, docs, examples, and CI are in place.

The next work should focus on making Toolsmith easier to adopt in real repositories and easier to integrate into CI/security workflows.

## 1. Config Support

Config support should let teams tune Toolsmith without changing source code or forking the rule set.

### Goals

- Let users enable or disable rules.
- Let users override rule severities.
- Let users configure lint failure thresholds.
- Let users set output defaults for reports, policy drafts, or eval ideas.
- Keep default behavior unchanged when no config file exists.

### Possible Config File Names

Support one obvious project-local config first:

- `toolsmith.config.json`

YAML or TypeScript config can wait until JSON proves insufficient.

### Suggested Shape

The first version can stay small:

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

Rule values could be:

- `off`
- `info`
- `warning`
- `error`

### Implementation Notes

- Add `src/config/`.
- Parse config once in CLI commands that run analysis.
- Keep config loading deterministic and local-file only.
- Validate config with Zod.
- Apply rule filtering and severity overrides before scoring, reporting, policy generation, and eval generation.
- Make config path explicit later with `--config`; start with auto-discovery only if it stays simple.

### Tests

- No config preserves current snapshots.
- Disabled rule removes findings.
- Severity override changes finding severity and scores.
- `lint.failOn` changes exit behavior.
- Invalid config returns exit code `2` with a clean Toolsmith error.

## 2. SARIF Output

SARIF would let Toolsmith findings appear in GitHub code scanning and other static-analysis workflows.

### Goals

- Add machine-readable SARIF output for lint/report workflows.
- Map Toolsmith findings to SARIF `result` entries.
- Preserve rule IDs, severity, recommendations, and evidence.
- Point findings at the analyzed OpenAPI file.

### CLI Options

Two reasonable paths:

- Add `--format sarif` to `toolsmith report`.
- Or add a dedicated `toolsmith sarif <file>` command.

Prefer `report --format sarif` if the output stays another report format.

### Mapping Sketch

- SARIF `tool.driver.name`: `Toolsmith`
- SARIF rule ID: Toolsmith rule ID
- SARIF result level:
  - `error` -> `error`
  - `warning` -> `warning`
  - `info` -> `note`
- SARIF message: finding message plus recommendation
- SARIF location: source OpenAPI file

OpenAPI operation-level paths are not line-aware yet. Initial SARIF can point to the file as a whole and include method/path in the message. Later, parser source-map support could improve locations.

### Tests

- Snapshot SARIF for `examples/risky-openapi.yaml`.
- Validate basic SARIF shape.
- Ensure all findings produce SARIF results.
- Ensure SARIF output is stable and deterministic.

## 3. Keep Examples Current

`examples/output/` is generated from `examples/risky-openapi.yaml`.

Add an `examples:check` script that regenerates outputs into a temp directory and compares them against committed examples. Once that exists, add it to CI so docs and sample outputs cannot drift silently.
