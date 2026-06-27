import { mkdir, writeFile } from "node:fs/promises";
import { analyzeOpenApi } from "@/core/analyze";
import { generateEvalIdeas, renderEvalIdeasYaml } from "@/generators/evals";
import { generatePolicyDraft, renderPolicyYaml } from "@/generators/policy";
import { renderJsonReport, renderMarkdownReport, renderTerminalReport } from "@/reporters";

const INPUT_FILE = "examples/risky-openapi.yaml";
const OUTPUT_DIR = "examples/output";

const result = await analyzeOpenApi(INPUT_FILE);

await mkdir(OUTPUT_DIR, { recursive: true });

await Promise.all([
  writeOutput("lint.txt", renderTerminalReport(result)),
  writeOutput("toolsmith-report.json", renderJsonReport(result)),
  writeOutput("TOOLSMITH_REPORT.md", renderMarkdownReport(result)),
  writeOutput("guard-policy.yaml", renderPolicyYaml(generatePolicyDraft(result))),
  writeOutput("toolsmith.evals.yaml", renderEvalIdeasYaml(generateEvalIdeas(result))),
]);

async function writeOutput(fileName: string, output: string): Promise<void> {
  await writeFile(`${OUTPUT_DIR}/${fileName}`, output, "utf8");
}
