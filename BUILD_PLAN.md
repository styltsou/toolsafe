# Toolsmith Build Plan

This plan starts from the current repo state, not from an empty project. The goal is to ship a small, credible CLI first, then layer reports, eval suggestions, and policy drafts on top of the same analysis result.

## Current Repo State

- `package.json` exists with Bun, TypeScript, Commander, Scalar OpenAPI Parser, YAML, Zod, picocolors, oxlint, and oxfmt.
- `src/core/types.ts` only contains `HttpMethod` and `RiskLevel`.
- `src/cli/index.ts`, `src/cli/commands/lint.ts`, reporters, and constants are currently empty.
- `index.ts` still contains the Bun starter `console.log`.
- `README.md` is still the Bun starter README.
- `package.json` has a typo: `typecheck` is `tsc -- noEmit`; it should be `tsc --noEmit`.
- There are no parsers, normalizer, rules, generators, examples, or tests yet.

## Stress Test: What Sounds Cool But Needs Discipline

### Keep

- The core idea is strong: deterministic OpenAPI analysis for agent-readiness is useful and easy to explain.
- Offline-first, no-LLM behavior is a good differentiator.
- Normalizing operations into a tool-like model is the right architectural center.
- JSON and Markdown reports make sense once the linter works.
- A generated policy draft is useful for your future OpenAPI-to-MCP project if it is clearly marked advisory.

### Narrow

- Evals should be described as recommended eval cases, not executable tests. Without a runtime harness, Toolsmith cannot know the real error codes, guard behavior, auth behavior, or side effects.
- Guard policies should be drafts, not enforcement. A policy file only matters when a future MCP proxy or generated server knows how to enforce it.
- Confirmation is not usually a native OpenAPI concept. Toolsmith can only detect explicit confirmation/guard signals in the spec, such as a `confirm` field, a custom `x-agent-guard` extension, or a generated policy rule. It should not claim to know that the real backend has no human approval flow.
- OpenAPI 3.1 support should mean parse and traverse common schema shapes. Full JSON Schema 2020-12 support is too broad for v0.
- Risk scores should be evidence-based and explainable, not presented as objective security truth.
- Terminal output should stay short. Put full details in JSON and Markdown.

### Defer

- Config files and severity overrides.
- SARIF.
- Remote URL input.
- Multi-file OpenAPI projects beyond what the parser handles naturally.
- LLM suggestions.
- MCP server generation.
- Runtime proxy or confirmation workflows.

## Recommended Milestones

### Milestone 0: Make The Skeleton Real

Definition of done: `bun run src/cli/index.ts --version`, `bun run typecheck`, and `bun test` run without embarrassing starter-code issues.

Purpose: before parsing OpenAPI, make sure the repository behaves like a real CLI project. This milestone is mostly wiring.

#### 0.1 Fix the package scripts

File: `package.json`

Change:

```json
"typecheck": "tsc -- noEmit"
```

to:

```json
"typecheck": "tsc --noEmit"
```

Add a convenience script:

```json
"cli": "bun run src/cli/index.ts"
```

Success check:

```bash
bun run typecheck
```

Expected result: TypeScript runs. If it reports code errors, fix those next. The important part is that `tsc` is receiving `--noEmit` correctly.

#### 0.2 Add the executable entrypoint metadata

File: `package.json`

Add this top-level field:

```json
"bin": {
  "toolsmith": "./src/cli/index.ts"
}
```

Why: this is what lets the package eventually expose a `toolsmith` executable.

Success check:

```bash
bun pm bin
```

Expected result: Bun prints its bin directory. You are not validating publishing yet; you are just making the package shape correct.

#### 0.3 Replace the empty CLI file with a real Commander program

File: `src/cli/index.ts`

Implement the smallest possible CLI:

```ts
#!/usr/bin/env bun

import { Command } from "commander";

const program = new Command();

program.name("toolsmith").description("Agent-readiness linting for OpenAPI tools").version("0.0.0");

program
  .command("rules")
  .description("List available Toolsmith rules")
  .action(() => {
    console.log("No rules implemented yet.");
  });

program.parseAsync(process.argv);
```

Do not add parser logic here. The CLI entrypoint should only register commands.

Success check:

```bash
bun run src/cli/index.ts --help
```

Expected result: help text with the built-in `--version` option and the `rules` command.

Commander already provides built-in version output from `.version('0.0.0')`. Do not create a separate `version` subcommand unless there is a later product reason to support both forms.

Success check:

```bash
bun run src/cli/index.ts --version
```

Expected output:

```txt
0.0.0
```

#### 0.4 Clean up the Bun starter file

File: `index.ts`

Replace:

```ts
console.log("Hello via Bun!");
```

with:

```ts
export const TOOLSMITH_PACKAGE_NAME = "toolsmith";
```

Why: the real app entrypoint is `src/cli/index.ts`. Leaving the starter output around creates confusion.

#### 0.5 Add a tiny smoke test

Create: `tests/smoke.test.ts`

Add:

```ts
import { expect, test } from "bun:test";

test("smoke", () => {
  expect(true).toBe(true);
});
```

This test is intentionally boring. Its job is to prove the test runner works before you write real parser tests.

Success check:

```bash
bun test
```

Expected result: 1 passing test.

#### 0.6 Update README just enough

File: `README.md`

Replace the Bun starter text with a short pre-alpha note:

````md
# Toolsmith

Agent-readiness linting for OpenAPI tools.

Toolsmith is currently pre-alpha. The first goal is a deterministic CLI that parses local OpenAPI files, normalizes operations, and reports agent-readiness findings.

## Development

```bash
bun install
bun run src/cli/index.ts --help
bun test
```
````

Do not write full product docs yet. Wait until `lint` works.

#### 0.7 Final Milestone 0 checklist

Run:

```bash
bun run src/cli/index.ts --help
bun run src/cli/index.ts --version
bun run src/cli/index.ts rules
bun run typecheck
bun test
```

Milestone 0 is done when all commands run and the output is understandable.

### Milestone 1: Parse Local OpenAPI Files

Definition of done: a valid YAML and JSON OpenAPI file can be parsed into metadata; invalid input returns a stable Toolsmith error.

Purpose: turn a local file path into a parsed OpenAPI document plus basic metadata. Do not normalize operations yet. Do not run rules yet.

#### 1.1 Create stable Toolsmith errors

Create: `src/core/errors.ts`

Add:

```ts
export type ToolsmithErrorCode =
  | "FILE_NOT_FOUND"
  | "UNSUPPORTED_FILE_TYPE"
  | "OPENAPI_PARSE_ERROR"
  | "OPENAPI_UNSUPPORTED_VERSION";

export class ToolsmithError extends Error {
  constructor(
    public readonly code: ToolsmithErrorCode,
    message: string,
    public readonly filePath?: string,
  ) {
    super(message);
    this.name = "ToolsmithError";
  }
}
```

Why: CLI code should not need to guess whether an error was a missing file, bad YAML, or unsupported OpenAPI version.

Success check: no runtime check yet; this is used by the parser tests.

#### 1.2 Define the parser return type

Create: `src/parsers/openapi.ts`

Start with:

```ts
export type OpenApiMetadata = {
  title?: string;
  version?: string;
  openapiVersion: string;
};

export type ParsedOpenApi = {
  filePath: string;
  document: unknown;
  metadata: OpenApiMetadata;
};
```

Keep `document` as `unknown` for now. You can narrow types after the parser works.

#### 1.3 Add file existence and extension checks

In `src/parsers/openapi.ts`, implement this before using Scalar OpenAPI Parser:

```ts
import { existsSync } from "node:fs";
import { extname } from "node:path";
import { ToolsmithError } from "../core/errors";

const SUPPORTED_EXTENSIONS = new Set([".yaml", ".yml", ".json"]);

function assertSupportedLocalFile(filePath: string): void {
  if (!existsSync(filePath)) {
    throw new ToolsmithError("FILE_NOT_FOUND", `File not found: ${filePath}`, filePath);
  }

  const extension = extname(filePath).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new ToolsmithError(
      "UNSUPPORTED_FILE_TYPE",
      "Toolsmith only supports local .yaml, .yml, and .json files in v0.",
      filePath,
    );
  }
}
```

Success checks:

- Passing `missing.yaml` should throw `FILE_NOT_FOUND`.
- Passing `openapi.txt` should throw `UNSUPPORTED_FILE_TYPE`.

#### 1.4 Use Scalar OpenAPI Parser to validate

In `src/parsers/openapi.ts`, add the main function:

```ts
import { validate } from "@scalar/openapi-parser";
import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";

export async function parseOpenApi(filePath: string): Promise<ParsedOpenApi> {
  assertSupportedLocalFile(filePath);

  const source = await readFile(filePath, "utf8");
  const validation = await validate(source);

  if (!validation.valid) {
    throw new ToolsmithError(
      "OPENAPI_PARSE_ERROR",
      validation.errors[0]?.message ?? "Could not parse OpenAPI file.",
      filePath,
    );
  }

  const document = parseYaml(source);
  const metadata = extractMetadata(document, filePath);

  return {
    filePath,
    document,
    metadata,
  };
}
```

Use `validate` first because it gives you a clean line between invalid specs and valid specs. Later, if validation is too strict for real-world specs, switch to `bundle` and perform lighter validation yourself.

#### 1.5 Extract metadata safely

In `src/parsers/openapi.ts`, add:

```ts
type OpenApiLike = {
  openapi?: unknown;
  info?: {
    title?: unknown;
    version?: unknown;
  };
};

function extractMetadata(document: unknown, filePath: string): OpenApiMetadata {
  if (!isObject(document)) {
    throw new ToolsmithError(
      "OPENAPI_PARSE_ERROR",
      "OpenAPI document must be an object.",
      filePath,
    );
  }

  const candidate = document as OpenApiLike;
  const openapiVersion = typeof candidate.openapi === "string" ? candidate.openapi : undefined;

  if (!openapiVersion) {
    throw new ToolsmithError("OPENAPI_PARSE_ERROR", "Missing required openapi field.", filePath);
  }

  if (!openapiVersion.startsWith("3.")) {
    throw new ToolsmithError(
      "OPENAPI_UNSUPPORTED_VERSION",
      `Only OpenAPI 3.x is supported in v0. Received: ${openapiVersion}`,
      filePath,
    );
  }

  return {
    openapiVersion,
    title: typeof candidate.info?.title === "string" ? candidate.info.title : undefined,
    version: typeof candidate.info?.version === "string" ? candidate.info.version : undefined,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

Success check: parsing a valid OpenAPI 3 file returns title, API version, and OpenAPI version.

#### 1.6 Add the risky YAML fixture

Create: `examples/risky-openapi.yaml`

Copy the example fixture from the PRD for now. Do not improve it yet. The point is to have a stable input that will later trigger obvious findings.

Success check:

```bash
test -f examples/risky-openapi.yaml
```

#### 1.7 Add one simple JSON fixture

Create: `tests/fixtures/simple-openapi.json`

Add:

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Simple API",
    "version": "1.0.0"
  },
  "paths": {
    "/health": {
      "get": {
        "operationId": "getHealth",
        "summary": "Get health",
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    }
  }
}
```

Why: this gives you one tiny valid spec for parser tests and keeps those tests easy to understand.

#### 1.8 Write parser tests one at a time

Create: `tests/parsers/openapi.test.ts`

Start with the happy path:

```ts
import { describe, expect, test } from "bun:test";
import { parseOpenApi } from "../../src/parsers/openapi";

describe("parseOpenApi", () => {
  test("parses a valid JSON OpenAPI file", async () => {
    const result = await parseOpenApi("tests/fixtures/simple-openapi.json");

    expect(result.metadata.title).toBe("Simple API");
    expect(result.metadata.version).toBe("1.0.0");
    expect(result.metadata.openapiVersion).toBe("3.0.0");
  });
});
```

Then add these tests, one by one:

1. Parses `examples/risky-openapi.yaml`.
2. Throws `FILE_NOT_FOUND` for a missing file.
3. Throws `UNSUPPORTED_FILE_TYPE` for `.txt`.
4. Throws `OPENAPI_PARSE_ERROR` for invalid YAML.
5. Throws `OPENAPI_UNSUPPORTED_VERSION` for Swagger/OpenAPI 2.0.

Do not write all tests first if you feel stuck. Add one, make it pass, then continue.

#### 1.9 Add a temporary parser debug command only if needed

You do not need a permanent CLI command for parsing. If you want to manually inspect parser output while building, create a temporary local script under `scripts/debug-parse.ts` and delete it before the milestone is done.

Prefer tests over debug scripts.

#### 1.10 Final Milestone 1 checklist

Run:

```bash
bun test tests/parsers/openapi.test.ts
bun run typecheck
```

Milestone 1 is done when:

- Valid JSON parses.
- Valid YAML parses.
- Missing files produce `FILE_NOT_FOUND`.
- Unsupported extensions produce `UNSUPPORTED_FILE_TYPE`.
- Invalid OpenAPI content produces a Toolsmith error instead of a raw library stack trace.
- No CLI linting exists yet. That belongs later.

### Milestone 2: Normalize Operations

Definition of done: OpenAPI paths become deterministic `NormalizedTool[]` values.

Tasks:

1. Expand `src/core/types.ts` with `NormalizedTool`, `NormalizedParameter`, `NormalizedResponse`, `Finding`, `Rule`, and `AnalysisResult`.
2. Create `src/core/normalize.ts`.
3. Iterate over path items and supported HTTP methods.
4. Merge path-level and operation-level parameters.
5. Extract request body schema from `application/json` first.
6. Extract response schemas from common content types.
7. Generate fallback IDs from method and path when `operationId` is missing.
8. Keep `rawOperation` for later rule evidence.
9. Sort normalized tools by path then method for stable output.
10. Add tests for GET, POST body, path/query params, fallback ID, and operation-level metadata.

### Milestone 3: Build The Rule Engine With Five Rules

Definition of done: `runRules` returns stable findings for the risky example.

Start with these rules only:

1. `safety/destructive-requires-guard`
2. `safety/mutating-requires-dry-run`
3. `schema/list-requires-pagination`
4. `docs/missing-description`
5. `errors/missing-error-schema`

Tasks:

1. Create `src/rules/types.ts` if you do not want rule types in core.
2. Create `src/rules/index.ts` exporting `defaultRules`.
3. Create text helpers for case-insensitive operation text matching.
4. Create schema helpers for shallow property lookup.
5. Implement `runRules(tools, rules)`.
6. Implement one rule at a time with tests before moving to the next.
7. Ensure each finding includes rule ID, severity, category, operation, message, recommendation, and evidence.
8. Sort findings by severity, path, method, and rule ID.

### Milestone 4: Analyze And Score

Definition of done: one function returns the complete `AnalysisResult` consumed by all outputs.

Status: complete.

Tasks:

1. Created `src/core/analyze.ts`.
2. Wired parse, normalize, risk classification, rules, and scoring.
3. Created `src/core/risk.ts` for method and keyword heuristics.
4. Added risk evidence, not just risk labels.
5. Implemented summary counts: total, read-only, mutating, destructive, high-risk.
6. Implemented overall score from finding severity.
7. Implemented category scores.
8. Added tests for risk, scoring, and full analysis output.

### Milestone 5: Ship `toolsmith lint`

Definition of done: `bun run src/cli/index.ts lint examples/risky-openapi.yaml` prints useful output and exits correctly.

Tasks:

1. Implemented `src/cli/commands/lint.ts`.
2. Implemented `src/reporters/terminal.ts`.
3. Supported `--format pretty|json`.
4. Supported `--fail-on warning|error` with default `error`.
5. Implemented exit codes: `0` clean, `1` threshold findings, `2` parse/input error.
6. Kept terminal output grouped by errors, warnings, info.
7. Added CLI smoke tests if practical; otherwise add core tests and manually verify CLI output.

### Milestone 6: JSON And Markdown Reports

Definition of done: reports use the same `AnalysisResult` as lint.

Status: complete.

Tasks:

1. Implemented `src/reporters/json.ts` as stable pretty JSON.
2. Implemented `src/reporters/markdown.ts` with concise PR-friendly sections.
3. Added `src/cli/commands/report.ts`.
4. Printed to stdout when `--out` is omitted.
5. Wrote to disk when `--out` is provided.
6. Added snapshot tests for JSON and Markdown using the risky fixture.

### Milestone 7: Add Remaining High-Value Rules

Definition of done: you have 10 reliable rules, not 15 noisy ones.

Status: complete.

Added:

1. `safety/financial-requires-idempotency`
2. `safety/external-communication-requires-guard`
3. `schema/vague-boolean`
4. `schema/string-should-be-enum`
5. `schema/sensitive-response-fields`

Defer unless still useful:

- File upload size constraints.
- Dangerous auth scope.
- Mutating description mentions side effects.
- Batch operation limits.
- Weak description.

### Milestone 8: Policy Draft Generator

Definition of done: policy generation is useful but clearly advisory.

Status: complete.

Tasks:

1. Created `src/generators/policy.ts`.
2. Based policy modes on operation risk and safety findings.
3. Included method, path, risk, mode, reasons, and recommended controls.
4. Added a top-level note that the policy is advisory and requires a runtime guard to enforce.
5. Added `src/cli/commands/policy.ts`.
6. Added snapshot test for risky fixture.

### Milestone 9: Eval Idea Generator

Definition of done: eval output contains deterministic recommended cases, not fake executable certainty.

Status: complete.

Tasks:

1. Created `src/generators/evals.ts`.
2. Generated cases from findings with generic placeholder inputs.
3. Included `type`, `operationId`, method, path, input, expected behavior, and reason.
4. Avoided inventing target-specific real error codes by using generic placeholders.
5. Added a top-level note that cases require adaptation to a concrete runtime.
6. Added `src/cli/commands/evals.ts`.
7. Added snapshot test for risky fixture.

### Milestone 10: Polish For First Public Demo

Definition of done: a developer can clone, run, inspect output, and understand the project in five minutes.

Status: complete.

Tasks:

1. Rewrote README around the actual CLI.
2. Added `docs/RULES.md` manually synced from rule metadata.
3. Added `docs/REPORT_FORMAT.md`.
4. Added sample output files under `examples/output/`.
5. Added GitHub Actions for typecheck, lint, format check, and tests.
6. Added npm publish notes after the CLI entrypoint worked.
7. Ran `bun run check` and `bun test` before calling MVP complete.

## First Ten Tasks To Do Next

1. Fix `package.json` `typecheck` script.
2. Add CLI shebang and Commander setup.
3. Implement `version` command.
4. Add `rules` placeholder that prints no rules yet.
5. Add `examples/risky-openapi.yaml`.
6. Add parser module and parse the risky example.
7. Add parser tests.
8. Define complete core types.
9. Implement normalizer for GET and POST.
10. Add first rule: `docs/missing-description`.

Starting with `docs/missing-description` is intentionally boring. It proves the rule engine shape without requiring schema traversal or risk heuristics.
