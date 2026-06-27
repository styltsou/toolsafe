import { describe, expect, test } from 'bun:test';
import { loadConfig } from '@/config/loader';
import { ToolSafeConfigSchema, type ToolSafeConfig } from '@/config/types';
import { analyzeOpenApi } from '@/core/analyze';

describe('config loader', () => {
  test('returns null when no config path given and no default file exists', () => {
    const result = loadConfig('/nonexistent/path/toolsafe.config.json');
    expect(result).toBeNull();
  });

  test('loads and validates config from an explicit path', () => {
    const result = loadConfig('tests/fixtures/toolsafe.config.json');

    expect(result).not.toBeNull();
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

  test('default config produces expected finding counts', async () => {
    const result = await analyzeOpenApi('examples/risky-openapi.yaml');

    expect(result.summary.findingCounts).toEqual({
      info: 5,
      warning: 18,
      error: 1,
    });
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
