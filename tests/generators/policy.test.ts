import { describe, expect, test } from "bun:test";
import { analyzeOpenApi } from "@/core/analyze";
import { generatePolicyDraft, renderPolicyYaml } from "@/generators/policy";

describe("policy generator", () => {
  test("generates a stable advisory policy draft for the risky fixture", async () => {
    const result = await analyzeOpenApi("examples/risky-openapi.yaml");

    expect(generatePolicyDraft(result)).toMatchSnapshot();
  });

  test("renders the risky fixture policy as stable YAML", async () => {
    const result = await analyzeOpenApi("examples/risky-openapi.yaml");
    const policy = generatePolicyDraft(result);

    expect(renderPolicyYaml(policy)).toMatchSnapshot();
  });
});
