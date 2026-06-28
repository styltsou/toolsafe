# Next Steps

ToolSafe is in a good state: local and remote OpenAPI parsing with `$ref` resolution, normalization, 15 deterministic rules, scoring, reports (JSON/Markdown/SARIF/HTML/terminal), advisory generation (guard policies + eval ideas), config support (toolsafe.config.json), init scaffolding, inline suppression via `x-toolsafe-ignore`, shell completions, docs, examples, and CI are all in place (169+ tests, typecheck clean, lint clean).

## High Priority

### Weighted scoring

The current flat 10/4/1 deduction doesn't account for operation count. A spec with 1 operation vs 100 operations gets penalized the same, making scores incomparable across API sizes.

### Polish terminal output

The terminal reporter works but could use better grouping (by severity, by tag), color coding, and a summary table.

## Medium Priority

### Rule runner smarts for cross-operation rules

The current `runRules` double-loop works fine for 15 single-operation rules. Before adding cross-operation rules (e.g. "all operations in a tag should have similar guard patterns"), the runner should pre-compute cross-operation indices once rather than making each rule re-derive them. See `docs/ARCHITECTURE_NEXT.md` for details.

### Rate-limiting / pagination rule improvements

The `list-requires-pagination` rule could be extended to detect additional pagination patterns (cursor-based, page-based, hybrid).

## Future (post-MVP)

- MCP tool definition input support
- OpenAPI-to-MCP safe generator
- Optional LLM mode for description improvements
- Runtime API execution or proxy behavior
