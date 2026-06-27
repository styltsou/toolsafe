import { describe, expect, test } from "bun:test";
import { analyzeOpenApi } from "@/core/analyze";
import { generateEvalIdeas, renderEvalIdeasYaml } from "@/generators/evals";

describe("eval idea generator", () => {
  test("generates stable advisory eval ideas for the risky fixture", async () => {
    const result = await analyzeOpenApi("examples/risky-openapi.yaml");

    expect(generateEvalIdeas(result)).toMatchSnapshot();
  });

  test("renders the risky fixture eval ideas as stable YAML", async () => {
    const result = await analyzeOpenApi("examples/risky-openapi.yaml");
    const evals = generateEvalIdeas(result);

    expect(renderEvalIdeasYaml(evals)).toMatchSnapshot();
  });
});
