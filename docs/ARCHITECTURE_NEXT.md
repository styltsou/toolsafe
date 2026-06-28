# Future Architecture: Smarter Rule Runner

## Current State

`runRules` in `src/rules/index.ts` is a flat double loop:

```
for each tool:
  for each rule:
    rule.check({ tool, allTools })
```

Every rule receives `allTools` but must re-derive any cross-operation context itself. No rule currently uses it.

## Problem

This works for 15 single-operation rules. It will not scale to:

- **Cross-operation rules** (e.g. "two POST operations on the same path must both have idempotency keys")
- **Aggregate rules** (e.g. "more than 50% of operations are missing descriptions")
- **Context-aware rules** (e.g. "this GET returns user data but no other operation in this tag has auth" — needs to know what sibling operations do)

Each of these would force the rule author to re-derive the same cross-operation index (group by path, group by tag, group by security scheme) inside their `check()` function, duplicating work across rules.

## Possible Direction

Decouple the runner from per-rule iteration. Instead of the runner calling `rule.check()`, have rules register what they need:

```ts
export const rule = defineRule({
  id: '...',
  check: (context) => {
    // context.groupedByPath — pre-computed
    // context.groupedByTag — pre-computed
    // context.allTags — pre-computed set
  },
});
```

The runner would:

1. Normalize all tools (already done)
2. Pre-compute cross-operation indices once (path groups, tag groups, method+path pairs)
3. Pass the pre-computed context to every rule

This keeps per-rule `check()` functions pure while eliminating repeated index-building.

## When to Revisit

- When adding the first cross-operation rule
- When a third rule duplicates a `groupBy` pattern already used by another rule
- When the rule count exceeds ~25

Do not implement this before there's concrete evidence of duplication. The current flat loop is simpler and sufficient.
