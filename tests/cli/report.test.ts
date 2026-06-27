import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../helpers/cli";

describe("toolsmith report CLI", () => {
  test("prints Markdown to stdout by default", async () => {
    const result = await runCli(["report", "examples/risky-openapi.yaml"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("# Toolsmith Agent-Readiness Report");
    expect(result.stdout).toContain("## Summary");
    expect(result.stdout).toContain("## Findings");
    expect(result.stderr).toBe("");
  });

  test("prints JSON to stdout when requested", async () => {
    const result = await runCli(["report", "examples/risky-openapi.yaml", "--format", "json"]);
    const report = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(report.summary.totalTools).toBe(5);
    expect(report.findings[0].ruleId).toBe("safety/destructive-requires-guard");
    expect(result.stderr).toBe("");
  });

  test("writes Markdown to disk when --out is provided", async () => {
    const directory = await mkdtemp(join(tmpdir(), "toolsmith-report-"));
    const outputPath = join(directory, "reports", "toolsmith-report.md");
    const result = await runCli([
      "report",
      "examples/risky-openapi.yaml",
      "--format",
      "markdown",
      "--out",
      outputPath,
    ]);
    const output = await readFile(outputPath, "utf8");

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(output).toContain("# Toolsmith Agent-Readiness Report");
  });

  test("exits 2 for invalid report formats", async () => {
    const result = await runCli(["report", "examples/risky-openapi.yaml", "--format", "html"]);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Invalid --format value");
  });

  test("exits 2 for input errors", async () => {
    const result = await runCli(["report", "README.md", "--format", "json"]);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Toolsmith UNSUPPORTED_FILE_TYPE");
  });
});
