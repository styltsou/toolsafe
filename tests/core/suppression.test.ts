import { describe, expect, test } from 'bun:test';
import type { Finding, NormalizedTool } from '@/core/types';
import { getIgnoredRuleIds, isAllIgnored, suppressIgnoredFindings } from '@/core/suppression';

const baseTool: NormalizedTool = {
  id: 'testTool',
  name: 'testTool',
  method: 'GET',
  path: '/test',
  tags: [],
  parameters: [],
  responses: [],
  operation: {},
};

describe('getIgnoredRuleIds', () => {
  test('returns empty array when no x-toolsafe-ignore extension exists', () => {
    expect(getIgnoredRuleIds(baseTool)).toEqual([]);
  });

  test('returns empty array when operation is empty', () => {
    expect(getIgnoredRuleIds({ ...baseTool, operation: {} })).toEqual([]);
  });

  test('returns empty array for non-array value', () => {
    const tool = { ...baseTool, operation: { 'x-toolsafe-ignore': 'not-an-array' } };
    expect(getIgnoredRuleIds(tool)).toEqual([]);
  });

  test('returns list of rule IDs from x-toolsafe-ignore', () => {
    const tool = {
      ...baseTool,
      operation: {
        'x-toolsafe-ignore': ['safety/destructive-requires-guard', 'errors/missing-error-schema'],
      },
    };
    expect(getIgnoredRuleIds(tool)).toEqual([
      'safety/destructive-requires-guard',
      'errors/missing-error-schema',
    ]);
  });

  test('filters out non-string entries from the array', () => {
    const tool = {
      ...baseTool,
      operation: {
        'x-toolsafe-ignore': ['safety/destructive-requires-guard', 123, true],
      },
    };
    expect(getIgnoredRuleIds(tool)).toEqual(['safety/destructive-requires-guard']);
  });

  test('returns empty array when operation is null', () => {
    const tool = { ...baseTool, operation: null } as unknown as NormalizedTool;
    expect(getIgnoredRuleIds(tool)).toEqual([]);
  });
});

describe('isAllIgnored', () => {
  test('returns false when no x-toolsafe-ignore-all extension exists', () => {
    expect(isAllIgnored(baseTool)).toBe(false);
  });

  test('returns true when x-toolsafe-ignore-all is true', () => {
    const tool = { ...baseTool, operation: { 'x-toolsafe-ignore-all': true } };
    expect(isAllIgnored(tool)).toBe(true);
  });

  test('returns false when x-toolsafe-ignore-all is false', () => {
    const tool = { ...baseTool, operation: { 'x-toolsafe-ignore-all': false } };
    expect(isAllIgnored(tool)).toBe(false);
  });

  test('returns false when x-toolsafe-ignore-all is a non-boolean truthy value', () => {
    const tool = { ...baseTool, operation: { 'x-toolsafe-ignore-all': 'yes' } };
    expect(isAllIgnored(tool)).toBe(false);
  });

  test('returns false when operation is null', () => {
    const tool = { ...baseTool, operation: null } as unknown as NormalizedTool;
    expect(isAllIgnored(tool)).toBe(false);
  });
});

function makeFinding(overrides: Partial<Finding>): Finding {
  return {
    ruleId: 'safety/destructive-requires-guard',
    severity: 'error',
    category: 'safety',
    toolId: 'deleteUser',
    toolName: 'deleteUser',
    method: 'DELETE',
    path: '/users/{id}',
    message: 'test',
    recommendation: 'test',
    ...overrides,
  };
}

function makeTool(overrides: Partial<NormalizedTool>): NormalizedTool {
  return {
    id: 'testTool',
    name: 'testTool',
    method: 'GET',
    path: '/test',
    tags: [],
    parameters: [],
    responses: [],
    operation: {},
    ...overrides,
  };
}

describe('suppressIgnoredFindings', () => {
  test('returns all findings when no tools have suppression extensions', () => {
    const findings = [makeFinding({ toolId: 'op1' }), makeFinding({ toolId: 'op2' })];
    const tools = [makeTool({ id: 'op1' }), makeTool({ id: 'op2' })];

    expect(suppressIgnoredFindings(findings, tools)).toEqual(findings);
  });

  test('suppresses findings for a specific rule ID via x-toolsafe-ignore', () => {
    const f1 = makeFinding({ toolId: 'op1', ruleId: 'safety/destructive-requires-guard' });
    const f2 = makeFinding({ toolId: 'op1', ruleId: 'errors/missing-error-schema' });
    const tools = [
      makeTool({
        id: 'op1',
        operation: { 'x-toolsafe-ignore': ['safety/destructive-requires-guard'] },
      }),
    ];

    const result = suppressIgnoredFindings([f1, f2], tools);

    expect(result).toEqual([f2]);
  });

  test('suppresses all findings for an operation via x-toolsafe-ignore-all', () => {
    const f1 = makeFinding({ toolId: 'op1', ruleId: 'safety/destructive-requires-guard' });
    const f2 = makeFinding({ toolId: 'op1', ruleId: 'errors/missing-error-schema' });
    const tools = [
      makeTool({
        id: 'op1',
        operation: { 'x-toolsafe-ignore-all': true },
      }),
    ];

    const result = suppressIgnoredFindings([f1, f2], tools);

    expect(result).toEqual([]);
  });

  test('does not suppress findings for unrelated operations', () => {
    const f1 = makeFinding({ toolId: 'op1', ruleId: 'safety/destructive-requires-guard' });
    const f2 = makeFinding({ toolId: 'op2', ruleId: 'errors/missing-error-schema' });
    const tools = [
      makeTool({ id: 'op1', operation: { 'x-toolsafe-ignore-all': true } }),
      makeTool({ id: 'op2' }),
    ];

    const result = suppressIgnoredFindings([f1, f2], tools);

    expect(result).toEqual([f2]);
  });

  test('returns empty array when all findings are suppressed', () => {
    const findings = [makeFinding({ toolId: 'op1' })];
    const tools = [makeTool({ id: 'op1', operation: { 'x-toolsafe-ignore-all': true } })];

    expect(suppressIgnoredFindings(findings, tools)).toEqual([]);
  });

  test('handles empty findings', () => {
    const tools = [makeTool({ id: 'op1', operation: { 'x-toolsafe-ignore-all': true } })];

    expect(suppressIgnoredFindings([], tools)).toEqual([]);
  });

  test('handles empty tools', () => {
    const findings = [makeFinding({ toolId: 'op1' })];

    expect(suppressIgnoredFindings(findings, [])).toEqual(findings);
  });

  test('ignores x-toolsafe-ignore with an invalid rule ID that never matches', () => {
    const f1 = makeFinding({ toolId: 'op1', ruleId: 'safety/destructive-requires-guard' });
    const tools = [
      makeTool({
        id: 'op1',
        operation: { 'x-toolsafe-ignore': ['nonexistent/rule'] },
      }),
    ];

    const result = suppressIgnoredFindings([f1], tools);

    expect(result).toEqual([f1]);
  });
});
