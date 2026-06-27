import { describe, expect, test } from "bun:test";
import { analyzeOpenApi } from "@/core/analyze";
import { renderJsonReport, renderMarkdownReport } from "@/reporters";

describe("reporters", () => {
  test("renders the risky fixture as stable pretty JSON", async () => {
    const result = await analyzeOpenApi("examples/risky-openapi.yaml");

    expect(renderJsonReport(result)).toMatchSnapshot();
  });

  test("renders the risky fixture as stable Markdown", async () => {
    const result = await analyzeOpenApi("examples/risky-openapi.yaml");

    expect(renderMarkdownReport(result)).toMatchSnapshot();
  });
});
