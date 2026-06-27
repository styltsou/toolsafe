import { describe, expect, test } from "bun:test";
import { runCli } from "../helpers/cli";

describe("toolsmith lint CLI", () => {
  test("prints useful pretty output and exits 1 on default error threshold", async () => {
    const result = await runCli(["lint", "examples/risky-openapi.yaml"]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Toolsmith Agent-Readiness Report");
    expect(result.stdout).toContain("Operations analyzed: 5");
    expect(result.stdout).toContain("Errors");
    expect(result.stdout).toContain("safety/destructive-requires-guard");
    expect(result.stderr).toBe("");
  });

  test("prints JSON output when requested", async () => {
    const result = await runCli(["lint", "examples/risky-openapi.yaml", "--format", "json"]);
    const report = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(1);
    expect(report.summary.totalTools).toBe(5);
    expect(report.findings[0].ruleId).toBe("safety/destructive-requires-guard");
  });

  test("exits 0 when findings are below the default error threshold", async () => {
    const result = await runCli(["lint", "tests/fixtures/simple-openapi.json"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Findings: 0 error, 1 warning, 0 info");
  });

  test("exits 1 when warnings meet the configured threshold", async () => {
    const result = await runCli([
      "lint",
      "tests/fixtures/simple-openapi.json",
      "--fail-on",
      "warning",
    ]);

    expect(result.exitCode).toBe(1);
  });

  test("exits 2 for input errors", async () => {
    const result = await runCli(["lint", "README.md"]);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Toolsmith UNSUPPORTED_FILE_TYPE");
  });
});
