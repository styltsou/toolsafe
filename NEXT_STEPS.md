# Next Steps

ToolSafe is in a good state: local and remote OpenAPI parsing, normalization, 15 deterministic rules, scoring, reports (JSON/Markdown/SARIF), advisory generation (guard policies + eval ideas), config support, docs, examples, and CI are in place (115 tests, typecheck clean, lint clean).

The next work should focus on making ToolSafe easier to adopt in real repositories and easier to integrate into CI/security workflows.

## High Priority

### HTTP proxy and auth support for remote URLs

Current remote URL support uses bare `fetch()`. Enterprise CI environments often need HTTP proxies, custom CA certificates, or authentication headers.

### `toolsafe init` — project scaffolding

Generate a starter `toolsafe.config.json` and a sample GitHub Actions workflow in one command.

## Medium Priority

- Polish terminal output with picocolors (better use of colors, grouping, formatting)
- JSON schema traversal improvements for deeper rule analysis
- Rate-limiting/pagination rule improvements for list endpoints
- Shell completion scripts (bash/zsh)

## Future (post-MVP)

- MCP tool definition input support
- OpenAPI-to-MCP safe generator
- Optional LLM mode for description improvements
- Runtime API execution or proxy behavior
