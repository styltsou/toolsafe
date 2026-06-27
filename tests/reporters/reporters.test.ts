import { describe, expect, test } from 'bun:test';
import { analyzeOpenApi } from '@/core/analyze';
import { renderJsonReport, renderMarkdownReport, renderSarifReport } from '@/reporters';

describe('reporters', () => {
  test('renders the risky fixture as stable pretty JSON', async () => {
    const result = await analyzeOpenApi('examples/risky-openapi.yaml');

    expect(renderJsonReport(result)).toMatchSnapshot();
  });

  test('renders the risky fixture as stable Markdown', async () => {
    const result = await analyzeOpenApi('examples/risky-openapi.yaml');

    expect(renderMarkdownReport(result)).toMatchSnapshot();
  });

  test('renders the risky fixture as valid SARIF', async () => {
    const result = await analyzeOpenApi('examples/risky-openapi.yaml');
    const output = renderSarifReport(result);
    const parsed = JSON.parse(output);

    expect(parsed.$schema).toBe(
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    );
    expect(parsed.version).toBe('2.1.0');
    expect(parsed.runs).toHaveLength(1);

    const run = parsed.runs[0];
    expect(run.tool.driver.name).toBe('ToolSafe');
    expect(run.tool.driver.rules).toBeInstanceOf(Array);
    expect(run.tool.driver.rules.length).toBeGreaterThan(0);

    expect(run.results).toBeInstanceOf(Array);
    expect(run.results.length).toBeGreaterThan(0);

    for (const sarifResult of run.results) {
      expect(sarifResult).toHaveProperty('ruleId');
      expect(sarifResult).toHaveProperty('ruleIndex');
      expect(['error', 'warning', 'note']).toContain(sarifResult.level);
      expect(sarifResult.message).toHaveProperty('text');
      expect(sarifResult.locations).toBeInstanceOf(Array);
      expect(sarifResult.locations.length).toBeGreaterThan(0);
      expect(sarifResult.locations[0].physicalLocation.artifactLocation).toHaveProperty('uri');
      expect(sarifResult.properties).toHaveProperty('category');
      expect(sarifResult.properties).toHaveProperty('method');
      expect(sarifResult.properties).toHaveProperty('path');
    }
  });

  test('SARIF output matches snapshot', async () => {
    const result = await analyzeOpenApi('examples/risky-openapi.yaml');

    expect(renderSarifReport(result)).toMatchSnapshot();
  });
});
