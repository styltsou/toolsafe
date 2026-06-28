# Full Document Model: A Future Architecture for ToolSafe

## Context

Today ToolSafe sits on top of `@scalar/openapi-parser` for validation and `$ref` resolution, then flattens parsed OpenAPI into a hand-rolled `NormalizedTool` model. Rules interact with `NormalizedTool` fields — `parameters`, `requestBodySchema`, `responses`, `security`, `operation` — plus generic `schema.ts` helpers.

This is pragmatic for 15 rules. But it is not the approach taken by production linters like [Vacuum](https://github.com/daveshanley/vacuum) or [Speakeasy's openapi CLI](https://github.com/speakeasy-api/openapi).

## How Speakeasy and Vacuum Structure Their Linters

### Shared foundation: a full document graph

Both Speakeasy and Vacuum are built on top of a **Go OpenAPI library** that maintains a full-fidelity document graph:

```
OpenAPI file → parse → full document graph (typed, indexed, resolved)
                          ↓
                    linter engine
                          ↓
                    rule functions
```

The document graph includes:

- A **node graph** (every YAML/JSON node in the spec is addressable)
- A **spec index** (pre-computed maps: operations by path, schemas by name, security schemes by key, tags, etc.)
- A **typed document model** (`v3.Document`, `v3.Operation`, `v3.Schema`, etc.) — not a flattened subset
- `$ref` resolution built into the graph layer — no separate dereference step

### What rules can do with this model

A rule in Vacuum or Speakeasy can:

1. **Navigate the full document tree** — access any property, any nesting depth, any vendor extension, any response media type
2. **Use pre-built indices** — `get all operations`, `get all schemas that reference X`, `find all paths with parameters` — without recomputing
3. **Walk the raw YAML node tree** — for location-aware output (line numbers, column numbers, auto-fix)
4. **Apply JSONPath selectors** (`$.paths.*.post.responses.200.content.*.schema.type`) — Vacuum's entire rule system is based on this

### Contrast with ToolSafe's current model

| Capability | ToolSafe today | Speakeasy / Vacuum |
|---|---|---|
| Document access | Flattened `NormalizedTool` fields + `operation: unknown` casts | Full typed document tree |
| `$ref` resolution | Post-parse dereference step | Built into the graph layer |
| Schema traversal | `schema.ts` helpers (top-level only) | Full schema tree with recursion |
| Rule writing | `if (!match) return []` + `createFinding()` | Any JS/TS function against the full document |
| Pre-computed indices | None (rules recompute) | `docInfo.getIndex().getOperations()`, `.getSchemas()`, etc. |
| Custom rules | Modify source code | TypeScript files loaded at runtime |
| JSONPath | Not supported | Core to Vacuum's rule model |
| Line-level output | Not tracked | Built into the node graph |

## Why This Matters

### 1. Rules become simpler and more powerful

Today a rule that wants to check "does this operation's response reference a schema that contains sensitive fields" must walk `NormalizedTool.responses[].schema?.properties` — but if that schema is `{ $ref: "#/components/schemas/User" }`, it hits a dead end (unless it manually resolves). With a full document model, referencing is transparent: `response.schema.properties` works regardless of `$ref`.

### 2. Cross-operation rules become feasible

A rule like "all operations sharing a tag should have the same authorization scheme" currently requires manually grouping `allTools` by tag inside the rule's `check()` function. With pre-built indices, it would be: `getOperationsByTag("users").forEach(...)`.

### 3. A foundation for custom/user-defined rules

If ToolSafe ever ships custom rules (via a plugin or RPC), a `NormalizedTool`-only model is too restrictive. Users would need to write against the same full document that built-in rules use. A document graph layer would be the shared contract.

### 4. Output quality

Line numbers, column numbers, and auto-fix suggestions require tracking the original YAML/JSON node positions. The current model discards this during normalization. A document graph preserves it.

## A Path Forward

This does not mean rewriting ToolSafe today. The current architecture is appropriate for v0.x. But the next major structural investment should be:

1. **Build a minimal spec index** — pre-compute `operationsByPath`, `schemasByName`, `operationsByTag` once in the runner, pass them to all rules via `RuleContext`
2. **Replace `operation: unknown` with a typed OpenAPI operation type** — the `@scalar/openapi-parser` already produces typed `OpenApiDocumentV3`. Use it instead of `Record<string, unknown>`
3. **Add schema depth helpers** — `flattenSchema(schema): SchemaProperty[]` that recursively walks `allOf`/`oneOf`/`$ref`-resolved properties (now that `$ref` resolution is in place)

Steps 2 and 3 unlock most of the benefit without a full architecture rewrite. Step 1 is documented in `ARCHITECTURE_NEXT.md`.

## When to Pivot

Consider a full document graph when:

- Rule count exceeds ~30 and cross-operation patterns emerge
- Custom/user-defined rules become a requested feature
- The `operation: unknown` casts in rules/helpers exceed ~5 distinct accessors
- Performance on 50K+ line specs becomes a concern (the graph adds overhead but enables optimization)
