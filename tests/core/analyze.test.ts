import { describe, expect, test } from 'bun:test';
import { analyzeOpenApi } from '@/core/analyze';

describe('analyzeOpenApi', () => {
  test('returns a complete analysis result for the risky example', async () => {
    const result = await analyzeOpenApi('examples/risky-openapi.yaml');

    expect(result.input).toEqual({
      filePath: 'examples/risky-openapi.yaml',
      title: 'Risky Example API',
      version: '1.0.0',
    });
    expect(result.summary).toEqual({
      totalTools: 5,
      readOnlyTools: 1,
      mutatingTools: 4,
      destructiveTools: 1,
      highRiskTools: 3,
      findingCounts: {
        info: 0,
        warning: 14,
        error: 1,
      },
    });
    expect(result.scores).toEqual({
      overall: 34,
      safety: 66,
      schema: 92,
      docs: 100,
      errors: 80,
      agentUsability: 96,
      auth: 100,
    });
    expect(result.tools.map((tool) => [tool.toolId, tool.risk])).toEqual([
      ['sendEmail', 'high'],
      ['chargePayment', 'high'],
      ['listUsers', 'low'],
      ['createUser', 'medium'],
      ['deleteUser', 'high'],
    ]);
    expect(result.findings).toHaveLength(15);
    expect(result.findings[0]).toMatchObject({
      ruleId: 'safety/destructive-requires-guard',
      severity: 'error',
      toolId: 'deleteUser',
    });
  });
});
