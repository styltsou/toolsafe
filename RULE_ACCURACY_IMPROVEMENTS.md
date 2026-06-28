# ToolSafe Rule Accuracy Improvements

## Context

ToolSafe's rules currently rely on keyword matching against
`getOperationSearchText()`, which concatenates `id`, `operationId`, `name`,
`method`, `path`, `summary`, `description`, and `tags` into one lowercased
string. Several rules then do a simple substring/word match against this
blob. This produces a structural false-positive problem: a keyword
appearing anywhere in free text (especially `description`, which can be a
full paragraph) triggers a finding, even when that text is not describing
the operation's own action.

Goal of this pass: reduce false positives by (1) scoping keyword matching to
the parts of the operation that actually signal intent (method + path +
operationId + summary — NOT full description body), (2) adding negative/
exclusion checks where a single keyword is not sufficient signal, and (3)
adding "should NOT flag" regression tests for every rule below, sourced from
realistic operation names.

Do not change rule IDs, severities, or the `Rule` interface. Only change
matching logic and add tests + a CHANGELOG entry per rule.

---

## 1. `safety/destructive-requires-guard.ts`

**Problem:** Matches `DESTRUCTIVE_KEYWORDS` against the full search text,
including descriptions. A `GET /cancellation-reasons` or a `POST
/subscriptions/{id}/resume` whose description happens to mention "previously
cancelled" will false-positive. Also: keyword match has no method
constraint other than the OR with `DELETE`, so a `GET` whose summary says
"Remove duplicate filters from the response" will incorrectly flag.

**Fix:**

- Require the operation to be mutating (`POST`/`PUT`/`PATCH`/`DELETE`) OR
  method `DELETE`, before keyword matching applies at all. A `GET` should
  never be flagged by this rule regardless of keyword content.
- Scope keyword matching to `operationId`, `path` segments, and `summary`
  only — drop `description` from the text searched by this rule
  specifically (add a narrower `getOperationIntentText()` helper that
  excludes `description`).
- Match keywords as whole path/word segments, not raw substrings (e.g.
  match `/cancel` as a path segment or `cancel` as a whole word in
  operationId/summary, not as a substring of `cancellation`).

**Add regression tests for:**

- `GET /subscriptions/{id}/cancellation-history` → should NOT flag.
- `POST /subscriptions/{id}/resume` with description mentioning "cancel" → should NOT flag.
- `DELETE /users/{id}` with no guard field → SHOULD flag (existing case).
- `POST /users/{id}/deactivate` with `x-agent-guard` extension → should NOT flag.

---

## 2. `safety/external-communication-requires-guard.ts`

**Problem:** `EXTERNAL_COMMUNICATION_KEYWORDS` includes generic words like
`message`, `send`, `publish`. A `POST /chat/messages` (internal chat
storage, not external comms) or `POST /articles/{id}/publish` (CMS publish,
not external comms) will false-positive.

**Fix:**

- Split the keyword list into high-confidence external-recipient signals
  (`email`, `sms`, `webhook`, `notify`, `invite`) vs. ambiguous ones
  (`message`, `send`, `publish`, `broadcast`). Require ambiguous keywords to
  co-occur with a recipient-shaped field in the input schema (e.g. `to`,
  `recipient`, `email`, `phoneNumber`, `address`) before flagging.
- Drop `description` from the searched text for the same reason as Rule 1;
  match against operationId/path/summary only.

**Add regression tests for:**

- `POST /chat/messages` (internal message store, no recipient field) → should NOT flag.
- `POST /articles/{id}/publish` (no recipient field) → should NOT flag.
- `POST /notifications/email` with `recipientEmail` field, no guard → SHOULD flag.

---

## 3. `safety/financial-requires-idempotency.ts`

**Problem:** Keywords like `credit`, `debit`, `bank` are broad. A `GET
/users/{id}/credits` (loyalty points) or `PATCH /accounts/{id}/bank-name`
(metadata edit, not a money movement) could false-positive once mutating +
keyword conditions are met.

**Fix:**

- Require the keyword match to be on `operationId` or last path segment
  (the resource/action being acted on), not on substrings anywhere in the
  path. E.g. `bank-name` should not match `bank` as a financial-action
  keyword; require the segment to equal or start the action verb position.
- Consider removing `credit`/`debit`/`bank` as standalone triggers and
  instead require they appear alongside a clear money-movement verb
  (`charge`, `transfer`, `payout`, `refund`, `payment`) in the same
  operationId/summary.

**Add regression tests for:**

- `PATCH /accounts/{id}/bank-name` → should NOT flag.
- `GET /loyalty/credits` → excluded already by method, but add explicit test.
- `POST /payments/{id}/refund` with no idempotency field → SHOULD flag.

---

## 4. `safety/batch-operation-requires-limit.ts`

**Problem:** `mass` and `all` (via reuse risk if list keywords get merged)
are weak signals. `mass` rarely appears; lower priority, but the keyword
match still spans descriptions, so a non-batch endpoint whose description
says "supports bulk import via separate endpoint" would false-positive.

**Fix:**

- Scope matching to operationId/path/summary, exclude description body
  (same fix pattern as above).
- Require an actual array/list-shaped request body input in addition to the
  keyword, since a genuinely "batch" endpoint should have a collection
  input; a keyword match with a scalar-only body is likely a false positive
  (e.g. `POST /jobs/bulk-status-check` with a single `jobId`).

**Add regression tests for:**

- `POST /jobs/bulk-status-check` with single scalar `jobId` field → should NOT flag (or document why it's intentionally still flagged, if you decide not to add the array-shape check).
- `POST /users/bulk-delete` with `userIds: string[]` and no limit field → SHOULD flag.

---

## 5. `docs/mutating-description-mentions-side-effects.ts`

**Problem:** This rule is actually reasonably scoped already (it only
checks for presence of side-effect verbs, doesn't need a "should NOT flag"
fix as urgently), but it currently treats `tool.description` absence and
"no side-effect verb present" identically. A short, otherwise-good
description like "Creates resource" already contains "creates" so it
passes — verify this is intended. Lower priority than rules 1–4.

**Fix (optional/lower priority):**

- No change required to matching logic. Add a test confirming a one-word
  summary like `"Create"` (no article, stem only) still matches due to
  substring matching on `creates`. Decide if `create` (no -s) should also be
  in `SIDE_EFFECT_VERBS` — currently only `creates`/`creates a`/`creates an`
  are listed, so a summary of exactly `"Create user"` will NOT match and
  WILL false-flag a perfectly fine description. Add `create`, `update`,
  `delete`, `remove`, `cancel`, `revoke` (bare stems) to the verb list.

**Add regression test for:**

- `POST /users` with description `"Create user"` → currently false-flags; should NOT flag after stem fix.

---

## 6. `schema/list-requires-pagination.ts`

**Problem:** `LIST_KEYWORDS` includes generic resource-name plurals like
`customers`, `users`, `items`, `events`. Any `GET` whose path or summary
contains these words is treated as a "list" operation even for singular
lookups like `GET /users/{id}/events/{eventId}` (a single nested resource
fetch, not a list).

**Fix:**

- Before keyword matching, check whether the operation path ends in a path
  parameter (e.g. `/{id}`) at the final segment. If so, it's a single-item
  fetch, not a collection — skip the rule regardless of keyword.
- Keep keyword matching only for paths whose final segment is NOT a path
  parameter.

**Add regression tests for:**

- `GET /users/{id}` → should NOT flag (singular resource, no plural-keyword issue here since `users` already implies a list keyword hit before the param-check fix).
- `GET /users/{id}/events/{eventId}` → should NOT flag after the param fix.
- `GET /users` with no pagination param → SHOULD flag (existing case).

---

## 7. `schema/string-should-be-enum.ts`, `schema/vague-boolean.ts`

**Problem:** Both match on property _name_ only (`status`, `mode`, `force`,
`flag`, etc.) regardless of context. These are lower false-positive risk
than the safety rules since they're schema-local, but a field named
`sortOrder` (string, free text like "name,-createdAt") would false-positive
on `order`/`sort` even though enumerating all valid sort expressions isn't
feasible.

**Fix (lower priority):**

- For `string-should-be-enum`, exclude properties whose schema has a
  `pattern` constraint already (a regex-constrained string is already
  explicit, just not via enum — don't double-flag).
- For `vague-boolean`, no major change needed; this one is genuinely just a
  naming-convention heuristic and is reasonably safe. Document this as
  intentionally aggressive/informational rather than "fixing" it.

**Add regression test for:**

- `string-should-be-enum`: property `sortOrder` with `pattern` set → should NOT flag.

---

## 8. Cross-cutting: add a narrower search-text helper

Add `getOperationIntentText()` in `src/rules/helpers.ts` alongside the
existing `getOperationSearchText()`:

```ts
// Excludes `description` — used by rules where matching against free-text
// prose (rather than the operation's own identifiers) causes false positives.
export function getOperationIntentText(tool: NormalizedTool): string {
  return [tool.id, tool.operationId, tool.name, tool.method, tool.path, tool.summary]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
}
```

Migrate rules 1–4 above to use this instead of `getOperationSearchText()`.
Keep `getOperationSearchText()` as-is for any rule that intentionally wants
full-text matching (if any remain after this pass — currently none should).

---

## 9. Validation step (do this last)

After implementing the above:

1. Run `toolsafe lint` against at least 2 large public OpenAPI specs (Stripe,
   GitHub, Shopify, or Twilio's public spec — pick whichever are easiest to
   fetch) before and after this change.
2. Record finding counts per rule, before/after, in
   `docs/CURRENT_STATE.md` under a new "Precision notes" section.
3. Confirm the total finding count drops without losing the seeded findings
   in `examples/risky-openapi.yaml` (run `bun run examples:check` — it
   should still report the same risky operations as findings unless this
   plan explicitly says otherwise above).
