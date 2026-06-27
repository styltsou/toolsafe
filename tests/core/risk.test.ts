import { describe, expect, test } from 'bun:test';
import type { NormalizedTool } from '@/core/types';
import { classifyToolRisk, classifyToolRisks } from '@/core/risk';

describe('classifyToolRisk', () => {
  test('classifies read-only methods as low risk', () => {
    const risk = classifyToolRisk(makeTool({ method: 'GET', name: 'getHealth' }));

    expect(risk.risk).toBe('low');
    expect(risk.reasons).toContain('HTTP method GET is generally read-only');
  });

  test('classifies mutating methods as medium risk', () => {
    const risk = classifyToolRisk(makeTool({ method: 'POST', name: 'createUser' }));

    expect(risk.risk).toBe('medium');
    expect(risk.reasons).toContain('HTTP method POST can mutate state');
  });

  test('classifies DELETE as high risk', () => {
    const risk = classifyToolRisk(makeTool({ method: 'DELETE', name: 'deleteUser' }));

    expect(risk.risk).toBe('high');
    expect(risk.reasons).toContain('HTTP method DELETE is destructive');
  });

  test('boosts financial or external side-effect keywords to high risk', () => {
    const risks = classifyToolRisks([
      makeTool({ method: 'POST', path: '/payments/charge', name: 'chargePayment' }),
      makeTool({ method: 'GET', path: '/emails/send-preview', name: 'getEmailPreview' }),
    ]);

    expect(risks.map((risk) => risk.risk)).toEqual(['high', 'high']);
    expect(risks[0]?.reasons).toContain('Risk keyword: payment');
    expect(risks[1]?.reasons).toContain('Risk keyword: email');
  });
});

function makeTool(overrides: Partial<NormalizedTool>): NormalizedTool {
  return {
    id: overrides.name ?? 'testTool',
    name: overrides.name ?? 'testTool',
    method: 'GET',
    path: '/test',
    tags: [],
    parameters: [],
    responses: [],
    rawOperation: {},
    ...overrides,
  };
}
