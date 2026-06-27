import { describe, expect, test } from 'bun:test';
import type { Finding } from '@/core/types';
import { calculateScore, calculateScores } from '@/core/scoring';

describe('calculateScore', () => {
  test('subtracts deterministic penalties by severity', () => {
    expect(
      calculateScore([
        makeFinding({ severity: 'error' }),
        makeFinding({ severity: 'warning' }),
        makeFinding({ severity: 'info' }),
      ]),
    ).toBe(85);
  });

  test('clamps scores at zero', () => {
    const findings = Array.from({ length: 11 }, () => makeFinding({ severity: 'error' }));

    expect(calculateScore(findings)).toBe(0);
  });
});

describe('calculateScores', () => {
  test('computes overall and category-specific scores', () => {
    const scores = calculateScores([
      makeFinding({ severity: 'error', category: 'safety' }),
      makeFinding({ severity: 'warning', category: 'errors' }),
      makeFinding({ severity: 'warning', category: 'agent_usability' }),
    ]);

    expect(scores).toEqual({
      overall: 82,
      safety: 90,
      schema: 100,
      docs: 100,
      errors: 96,
      agentUsability: 96,
      auth: 100,
    });
  });
});

function makeFinding(overrides: Partial<Finding>): Finding {
  return {
    ruleId: 'test/rule',
    severity: 'warning',
    category: 'safety',
    toolId: 'testTool',
    toolName: 'testTool',
    method: 'GET',
    path: '/test',
    message: 'Test finding',
    recommendation: 'Fix the test finding.',
    ...overrides,
  };
}
