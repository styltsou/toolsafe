import { describe, expect, test } from 'bun:test';
import { loadConfig } from '@/config/loader';
import { ToolSafeConfigSchema, type ToolSafeConfig } from '@/config/types';
import { analyzeOpenApi } from '@/core/analyze';

describe('config loader', () => {
  test('returns undefined when no config path given and no default file exists', () => {
    const result = loadConfig();
    expect(result).toBeUndefined();
  });

  test('throws when an explicit config path does not exist', () => {
    expect(() => loadConfig('/nonexistent/path/toolsafe.config.json')).toThrow(
      'Config file not found',
    );
  });

  test('loads and validates config from an explicit path', () => {
    const result = loadConfig('tests/fixtures/toolsafe.config.json');

    expect(result).not.toBeUndefined();
    expect(result!.rules).toEqual({
      'safety/destructive-requires-guard': 'off',
      'errors/missing-error-schema': 'error',
    });
    expect(result!.lint?.failOn).toBe('warning');
  });
});

describe('config schema validation', () => {
  test('accepts a valid config', () => {
    const result = ToolSafeConfigSchema.safeParse({
      rules: {
        'safety/destructive-requires-guard': 'off',
      },
      lint: {
        failOn: 'warning',
      },
    });

    expect(result.success).toBe(true);
  });

  test('accepts an empty config', () => {
    const result = ToolSafeConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  test('rejects unknown rule values', () => {
    const result = ToolSafeConfigSchema.safeParse({
      rules: {
        'some/rule': 'invalid',
      },
    });

    expect(result.success).toBe(false);
  });

  test('rejects unknown lint.failOn values', () => {
    const result = ToolSafeConfigSchema.safeParse({
      lint: {
        failOn: 'critical',
      },
    });

    expect(result.success).toBe(false);
  });

  test('accepts report config', () => {
    const result = ToolSafeConfigSchema.safeParse({
      report: {
        format: 'sarif',
        out: 'results.sarif',
      },
    });

    expect(result.success).toBe(true);
  });

  test('accepts partial report config', () => {
    const result = ToolSafeConfigSchema.safeParse({
      report: {
        format: 'json',
      },
    });

    expect(result.success).toBe(true);
  });

  test('rejects unknown report.format values', () => {
    const result = ToolSafeConfigSchema.safeParse({
      report: {
        format: 'pdf',
      },
    });

    expect(result.success).toBe(false);
  });
});

describe('config disables rules', () => {
  test('eliminates findings for disabled rules', async () => {
    const config: ToolSafeConfig = {
      rules: {
        'safety/destructive-requires-guard': 'off',
      },
    };

    const result = await analyzeOpenApi('examples/risky-openapi.yaml', config);

    const errorFindings = result.findings.filter((f) => f.ruleId === 'safety/destructive-requires-guard');
    expect(errorFindings).toHaveLength(0);
  });

  test('disabling a rule does not affect other rules', async () => {
    const config: ToolSafeConfig = {
      rules: {
        'safety/destructive-requires-guard': 'off',
      },
    };

    const result = await analyzeOpenApi('examples/risky-openapi.yaml', config);

    expect(result.findings.some((f) => f.ruleId === 'errors/missing-error-schema')).toBe(true);
    expect(result.findings.some((f) => f.ruleId === 'safety/mutating-requires-dry-run')).toBe(true);
  });

  test('returns all findings when no config is given', async () => {
    const noConfig = await analyzeOpenApi('examples/risky-openapi.yaml');
    const withConfig = await analyzeOpenApi('examples/risky-openapi.yaml', undefined);

    expect(noConfig.findings).toEqual(withConfig.findings);
  });
});

describe('config overrides severity', () => {
  test('changes severity for the specified rule', async () => {
    const config: ToolSafeConfig = {
      rules: {
        'errors/missing-error-schema': 'error',
      },
    };

    const result = await analyzeOpenApi('examples/risky-openapi.yaml', config);

    const errorFindings = result.findings.filter((f) => f.ruleId === 'errors/missing-error-schema');
    expect(errorFindings.length).toBeGreaterThan(0);
    for (const finding of errorFindings) {
      expect(finding.severity).toBe('error');
    }
  });

  test('default config produces non-zero finding counts', async () => {
    const result = await analyzeOpenApi('examples/risky-openapi.yaml');

    const { info, warning, error } = result.summary.findingCounts;
    expect(info + warning + error).toBeGreaterThan(0);
    expect(info).toBeGreaterThanOrEqual(0);
    expect(warning).toBeGreaterThan(0);
    expect(error).toBeGreaterThanOrEqual(0);
  });

  test('config can promote warnings to errors', async () => {
    const config: ToolSafeConfig = {
      rules: {
        'safety/mutating-requires-dry-run': 'error',
      },
    };

    const result = await analyzeOpenApi('examples/risky-openapi.yaml', config);

    const promotedFindings = result.findings.filter((f) => f.ruleId === 'safety/mutating-requires-dry-run');
    expect(promotedFindings.length).toBeGreaterThan(0);
    for (const finding of promotedFindings) {
      expect(finding.severity).toBe('error');
    }
  });

  test('combined disable and severity override', async () => {
    const config: ToolSafeConfig = {
      rules: {
        'safety/destructive-requires-guard': 'off',
        'errors/missing-error-schema': 'error',
        'docs/mutating-description-mentions-side-effects': 'off',
      },
    };

    const result = await analyzeOpenApi('examples/risky-openapi.yaml', config);

    expect(result.findings.filter((f) => f.ruleId === 'safety/destructive-requires-guard')).toHaveLength(0);
    expect(result.findings.filter((f) => f.ruleId === 'docs/mutating-description-mentions-side-effects')).toHaveLength(0);

    const promotedFindings = result.findings.filter((f) => f.ruleId === 'errors/missing-error-schema');
    expect(promotedFindings.length).toBeGreaterThan(0);
    for (const finding of promotedFindings) {
      expect(finding.severity).toBe('error');
    }
  });
});
